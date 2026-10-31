// Lot-level plan: split the units over the ranked routes, keep a fallback,
// and run the checks that only make sense on the whole plan (French quota, co-owner, ...).

import type { Allocation, Check, Ctx, Exclusion, Farm, Lot, Plan, PlanId, PlanTotals, Route } from './types.ts'

const certaintyOf = (r: Route, ctx: Ctx) => ctx.data.params.certainty[r.receiver.stage]

// Greedy in rank order: fill each receiver up to its maximum, skip it if fewer
// units are left than it needs. Each lot sees the full receiver capacity
// (no competition between lots yet).
export function allocateLot(lot: Lot, routes: Route[], ctx: Ctx): Allocation {
  let remaining = lot.quantity
  const lines: Allocation['lines'] = []
  for (const route of routes) {
    if (remaining <= 0) break
    // A pooled (single-turbine) lot adds to a larger programme, so the receiver's minimum doesn't apply.
    if (!lot.pooled && remaining < route.receiver.quantity_min) continue
    const units = Math.min(remaining, route.receiver.quantity_max)
    lines.push({ route, units })
    remaining -= units
  }

  const uncertain_units = lines.filter((l) => certaintyOf(l.route, ctx) < 1).reduce((s, l) => s + l.units, 0)
  // Fallback: a certain recycling/recovery route with room for every uncertain unit.
  const certainEnd = routes.filter((r) => certaintyOf(r, ctx) === 1 && r.receiver.tier >= 3)
  const used = (r: Route) => lines.find((l) => l.route === r)?.units ?? 0
  const fallback =
    uncertain_units === 0
      ? null
      : (certainEnd.find((r) => r.receiver.quantity_max - used(r) >= uncertain_units) ?? null)

  return { lines, unallocated: remaining, uncertain_units, fallback }
}

export function planTotals(lot: Lot, a: Allocation, ctx: Ctx): PlanTotals {
  const p = ctx.data.params
  const t = { co2_t: 0, cost_eur: 0, avoided_t: 0, embodied_kept_gj: 0, transport_gj: 0, reuse_units: 0, certain: 0 }
  for (const { route, units } of a.lines) {
    t.co2_t += route.co2_per_unit_t * units
    t.cost_eur += route.cost_per_unit_eur * units
    t.avoided_t += route.avoided_per_unit_t * units
    t.embodied_kept_gj += route.embodied_kept_per_unit_gj * units
    t.transport_gj += route.transport_per_unit_gj * units
    if (route.receiver.tier <= 2) t.reuse_units += units
    t.certain += certaintyOf(route, ctx) * units
  }
  const { certain, ...rest } = t
  return {
    ...rest,
    net_t: t.avoided_t - t.co2_t,
    embodied_total_gj: lot.quantity * lot.unit_mass_t * p.embodied_mj_per_kg[lot.item],
    certainty: lot.quantity ? certain / lot.quantity : 0,
  }
}

// Three ways to split the lot, so the recommended plan can be compared with real alternatives.
export function buildPlans(lot: Lot, routes: Route[], ctx: Ctx): Plan[] {
  const make = (id: PlanId, name: string, rule: string, order: Route[]): Plan => {
    const allocation = allocateLot(lot, order, ctx)
    return { id, name, rule, allocation, totals: planTotals(lot, allocation, ctx) }
  }
  return [
    make('recommended', 'Recommended', 'Waste hierarchy first, then the weighted score', routes),
    make('low_risk', 'Lowest risk', 'Only selected or contracted demand, waste hierarchy first',
      routes.filter((r) => certaintyOf(r, ctx) >= 0.8)),
    make('cheapest', 'Cheapest transport', 'Lowest transport cost per unit, ignores the waste hierarchy',
      [...routes].sort((a, b) => a.cost_per_unit_eur - b.cost_per_unit_eur)),
  ]
}

const FIT_LABEL: Record<keyof Route['fits'], string> = {
  timing: 'timing', condition: 'condition', co2: 'low transport CO₂', cost: 'low transport cost', certainty: 'demand certainty',
}
const gj = (v: number) => `${Math.round(v).toLocaleString('en')} GJ`
const eur = (v: number) => (Math.abs(v) >= 1e6 ? `€${(v / 1e6).toFixed(2)} M` : `€${Math.round(v / 1e3)} k`)

// Plain-language reasons, all computed from the numbers (no AI text).
export function explainPlan(plan: Plan, plans: Plan[], excluded: Exclusion[], lot: Lot): string[] {
  const out: string[] = []
  const t = plan.totals
  const cheap = plans.find((p) => p.id === 'cheapest')!
  const safe = plans.find((p) => p.id === 'low_risk')!

  out.push(`${t.reuse_units} of ${lot.quantity} units stay in use (reuse or repurpose); waste-hierarchy law and policy rank these above recycling.`)

  if (plan.id !== 'cheapest') {
    const dE = t.embodied_kept_gj - cheap.totals.embodied_kept_gj
    const dC = t.cost_eur - cheap.totals.cost_eur
    if (Math.abs(dE) > 1)
      out.push(`Keeps ${gj(Math.abs(dE))} ${dE > 0 ? 'more' : 'less'} embodied energy than the cheapest plan, for ${eur(Math.abs(dC))} ${dC >= 0 ? 'more' : 'less'} transport.`)
  }

  const top = plan.allocation.lines[0]?.route
  if (top) {
    const best = (Object.keys(top.fits) as (keyof Route['fits'])[])
      .sort((a, b) => top.fits[b] - top.fits[a])
      .slice(0, 2)
      .map((k) => FIT_LABEL[k])
    out.push(`${top.receiver.name} comes first in its tier (score ${top.score.toFixed(2)}), strongest on ${best.join(' and ')}.`)
  }

  if (plan.id !== 'low_risk' && t.certainty < safe.totals.certainty - 0.01)
    out.push(
      `${Math.round(t.certainty * 100)}% expected delivery vs ${Math.round(safe.totals.certainty * 100)}% for the lowest-risk plan` +
        (plan.allocation.fallback ? `; if projects fall through, units go to ${plan.allocation.fallback.receiver.name}.` : '.'),
    )

  if (excluded.length)
    out.push(`${excluded.length} receivers ruled out, e.g. ${excluded[0].receiver.name}: ${excluded[0].reason.split(' · ')[0].toLowerCase()}.`)
  return out
}

export function checkPlan(farm: Farm, lot: Lot, a: Allocation, ctx: Ctx, coOwnerApproved: boolean): Check[] {
  const p = ctx.data.params
  const checks: Check[] = []

  checks.push({
    id: 'complete',
    label: 'Every unit has a route',
    ok: a.unallocated === 0,
    detail: a.unallocated === 0 ? `${lot.quantity} of ${lot.quantity} units planned` : `${a.unallocated} units have no route`,
    source: 'data',
    blocking: true,
  })

  if (a.uncertain_units > 0)
    checks.push({
      id: 'fallback',
      label: 'Fallback for uncertain demand',
      ok: a.fallback !== null,
      detail: a.fallback
        ? `${a.uncertain_units} units on announced or open projects fall back to ${a.fallback.receiver.name}`
        : `${a.uncertain_units} units depend on uncertain demand and no certain route has room`,
      source: 'policy',
      blocking: true,
    })

  if (farm.regime === 'FR_2020' && lot.item === 'blade') {
    // Co-processing counts as 0 until we verify it counts as recycling in France.
    const counted = a.lines
      .filter((l) => l.route.receiver.tier <= 3 && l.route.receiver.kind !== 'coprocessing')
      .reduce((s, l) => s + l.units, 0)
    const share = counted / lot.quantity
    checks.push({
      id: 'fr-quota',
      label: `French rotor quota ≥ ${Math.round(p.fr_rotor_quota * 100)}% reused or recycled`,
      ok: share >= p.fr_rotor_quota,
      detail: `${Math.round(share * 100)}% of rotor mass in tiers 1–3 (arrêté 22 June 2020, Art. 20; co-processing counted as 0)`,
      source: 'law',
      blocking: true,
    })
  }

  const perHub = new Map<string, number>()
  for (const l of a.lines) perHub.set(l.route.hub.id, (perHub.get(l.route.hub.id) ?? 0) + l.units)
  for (const [hubId, units] of perHub) {
    const hub = ctx.data.hubs.find((h) => h.id === hubId)!
    const cap = hub.capacity[lot.item]
    if (units > cap)
      checks.push({
        id: `hub-${hubId}`,
        label: `${hub.name} capacity`,
        ok: false,
        detail: `${units} units planned through a hub that holds ${cap}: stagger dismantling or split hubs`,
        source: 'data',
        blocking: false,
      })
  }

  if (farm.alpiq_share < 1)
    checks.push({
      id: 'co-owner',
      label: 'Co-owner approval',
      ok: coOwnerApproved,
      detail: `Alpiq holds ${Math.round(farm.alpiq_share * 100)}%; the co-owner must approve the plan`,
      source: 'policy',
      blocking: true,
    })

  checks.push({
    id: 'no-landfill',
    label: 'No landfill',
    ok: true,
    detail: 'Landfill is never offered (WindEurope pledge from 1 Jan 2026; law in DE, NL, CH)',
    source: 'policy',
    blocking: false,
  })
  return checks
}
