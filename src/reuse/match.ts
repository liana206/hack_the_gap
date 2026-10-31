// Matching rules: filter → choose hub → transport → score → rank.
// Plain functions, no React, so the same rules can run on real lots later.
// Rules and their sources: docs/reuse-rules-and-data.md

import type { Badge, Ctx, Exclusion, Farm, Grade, Hub, Leg, Lot, Receiver, Route } from './types.ts'

const GRADE: Record<Grade, number> = { A: 3, B: 2, C: 1 }

export function haversineKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180
  const dLat = (b[0] - a[0]) * rad
  const dLon = (b[1] - a[1]) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const leg = (from: [number, number], to: [number, number], roadFactor: number): Leg => ({
  from,
  to,
  km: Math.round(haversineKm(from, to) * roadFactor),
})

export const isFlagged = (farm: Farm, year: number, windowYears: number) => year >= farm.end_of_life - windowYears

// Every reason a receiver cannot take this lot. Empty list = valid.
function exclusionReasons(farm: Farm, lot: Lot, r: Receiver, ctx: Ctx): Omit<Exclusion, 'receiver'>[] {
  const p = ctx.data.params
  const out: Omit<Exclusion, 'receiver'>[] = []
  const available = farm.end_of_life
  const spec = (reason: string) => out.push({ reason, source: 'spec' })

  if (r.deadline !== undefined && r.deadline < ctx.year) spec(`Call closed in ${r.deadline}`)
  if (r.needed_by !== null && r.needed_by < available) spec(`Needed by ${r.needed_by}, lot only free from ${available}`)
  if (lot.length_m !== undefined) {
    if (r.length_min !== undefined && lot.length_m < r.length_min) spec(`Length ${lot.length_m} m < ${r.length_min} m required`)
    if (r.length_max !== undefined && lot.length_m > r.length_max) spec(`Length ${lot.length_m} m > ${r.length_max} m allowed`)
  }
  if (lot.diameter_m !== undefined) {
    if (r.diameter_min !== undefined && lot.diameter_m < r.diameter_min) spec(`Diameter ${lot.diameter_m} m < ${r.diameter_min} m`)
    if (r.diameter_max !== undefined && lot.diameter_m > r.diameter_max) spec(`Diameter ${lot.diameter_m} m > ${r.diameter_max} m`)
  }
  if (r.models && !r.models.includes(lot.model ?? '')) spec(`Not compatible with ${lot.model} (takes ${r.models.join(', ')})`)
  if (GRADE[lot.grade] < GRADE[r.min_grade]) spec(`Grade ${lot.grade} below minimum ${r.min_grade}`)
  if (r.min_passport_pct !== undefined && lot.passport_pct < r.min_passport_pct)
    spec(`Passport ${lot.passport_pct}% < ${r.min_passport_pct}% required`)
  if (r.needs_geometry_model && !lot.has_geometry_model) spec('Needs a 3D blade model in the passport')
  if (lot.item === 'blade' && ctx.segmented && r.needs_whole_blade) spec('Needs whole blades; lot is set to segmented')
  if (r.quantity_min > lot.quantity) spec(`Needs at least ${r.quantity_min} units, lot has ${lot.quantity}`)

  if (r.approval_months !== undefined && r.needed_by !== null && (r.needed_by - ctx.year) * 12 < r.approval_months)
    out.push({
      reason: `Structural approval takes ${r.approval_months} months; too late to start before ${r.needed_by}`,
      source: 'law',
    })

  const waitYears = r.needed_by === null ? 0 : r.needed_by - available
  if (lot.item_status === 'waste' && waitYears > p.storage_limit_years_waste)
    out.push({
      reason: `Waste would wait ${waitYears} years in storage; over ${p.storage_limit_years_waste} years counts as landfill (Landfill Directive 1999/31 Art. 2)`,
      source: 'law',
    })
  return out
}

function hubsFor(lot: Lot, ctx: Ctx): Hub[] {
  return ctx.data.hubs.filter((h) => h.capacity[lot.item] > 0 && (lot.item_status !== 'waste' || h.licensed_for_waste))
}

// Items wait at the hub nearest the farm until matched, so leg 1 is the same for every receiver.
function nearestHub(farm: Farm, hubs: Hub[]): Hub {
  const d = (h: Hub) => haversineKm([farm.lat, farm.lon], [h.lat, h.lon])
  return hubs.reduce((a, b) => (d(b) < d(a) ? b : a))
}

// Transport, cost and CO2 per unit for one receiver via the farm's hub.
function buildRoute(farm: Farm, lot: Lot, r: Receiver, hub: Hub, ctx: Ctx): Omit<Route, 'fits' | 'score'> {
  const p = ctx.data.params
  const l1 = leg([farm.lat, farm.lon], [hub.lat, hub.lon], p.road_factor)
  const l2 = leg([hub.lat, hub.lon], [r.lat, r.lon], p.road_factor)
  const best = { hub, l1, l2, km: l1.km + l2.km }

  const segmentedBlade = lot.item === 'blade' && ctx.segmented
  const oversize = lot.item === 'blade' ? !ctx.segmented : lot.item === 'steel' // tower sections are oversize
  const trucks_per_unit =
    lot.item === 'blade'
      ? segmentedBlade
        ? 1 / p.blades_per_truck_segmented
        : 1
      : lot.item === 'steel'
        ? 1
        : 1 / Math.max(1, Math.floor(p.truck_payload_t / lot.unit_mass_t))

  const countries = [...new Set([farm.country, best.hub.country, r.country])]
  const notification = lot.item_status === 'waste' && countries.length > 1
  const mode = oversize ? 'oversize' : 'standard'
  const co2_per_unit_t = (trucks_per_unit * best.km * p.ef_kg_per_km[mode]) / 1000
  const cost_per_unit_eur =
    trucks_per_unit * best.km * p.rate_eur_per_km[mode] +
    (segmentedBlade ? p.cutting_eur_per_blade : 0) +
    (oversize ? p.permit_eur_per_country * countries.length * trucks_per_unit : 0)

  const badges: Badge[] = []
  if (notification)
    badges.push({
      text: countries.includes('CH') ? 'Waste export: FOEN approval (VeVA)' : 'Waste shipment notification (EU WSR 2024/1157)',
      source: 'law',
    })
  if (r.approval_months) badges.push({ text: `Structural approval ${r.approval_months} months`, source: 'law' })
  if (oversize) badges.push({ text: `Oversize permits in ${countries.length} ${countries.length > 1 ? 'countries' : 'country'}`, source: 'assumption' })
  if (r.stage !== 'contracted') badges.push({ text: `Demand ${r.stage.replace('_', ' ')}: not certain`, source: 'assumption' })

  return {
    receiver: r,
    hub: best.hub,
    leg1: best.l1,
    leg2: best.l2,
    oversize,
    trucks_per_unit,
    co2_per_unit_t,
    cost_per_unit_eur,
    avoided_per_unit_t: r.avoided_co2_per_t * lot.unit_mass_t,
    // t × MJ/kg = GJ
    embodied_kept_per_unit_gj: lot.unit_mass_t * p.embodied_mj_per_kg[lot.item] * p.embodied_retention[lot.item][r.tier - 1],
    transport_per_unit_gj: (trucks_per_unit * best.km * p.transport_mj_per_km[mode]) / 1000,
    countries,
    notification,
    badges,
  }
}

const norm = (v: number, min: number, max: number) => (max > min ? (v - min) / (max - min) : 0)

export function rankLot(farm: Farm, lot: Lot, ctx: Ctx): { routes: Route[]; excluded: Exclusion[] } {
  const p = ctx.data.params
  const excluded: Exclusion[] = []
  const hubs = hubsFor(lot, ctx)
  const hub = hubs.length ? nearestHub(farm, hubs) : null
  const draft: Omit<Route, 'fits' | 'score'>[] = []

  for (const r of ctx.data.receivers.filter((x) => x.item === lot.item)) {
    const reasons = exclusionReasons(farm, lot, r, ctx)
    if (!hub) reasons.push({ reason: 'No hub licensed to store waste', source: 'law' })
    if (reasons.length || !hub) {
      excluded.push({
        receiver: r,
        reason: reasons.map((x) => x.reason).join(' · '),
        source: reasons.some((x) => x.source === 'law') ? 'law' : 'spec',
      })
    } else draft.push(buildRoute(farm, lot, r, hub, ctx))
  }

  // CO2 and cost are normalised across the valid candidates of this lot.
  const co2s = draft.map((d) => d.co2_per_unit_t)
  const costs = draft.map((d) => d.cost_per_unit_eur)
  const w = ctx.weights
  const wSum = w.timing + w.condition + w.co2 + w.cost + w.certainty

  const routes: Route[] = draft.map((d) => {
    const r = d.receiver
    const slack = r.needed_by === null ? 0 : Math.max(0, r.needed_by - farm.end_of_life)
    let timing = 1 - Math.min(slack, 5) / 5
    if (d.notification) timing = Math.max(0, timing - p.notification_months / 24)
    const fits = {
      timing,
      condition: (GRADE[lot.grade] - GRADE[r.min_grade] + 1) / (4 - GRADE[r.min_grade]),
      co2: 1 - norm(d.co2_per_unit_t, Math.min(...co2s), Math.max(...co2s)),
      cost: 1 - norm(d.cost_per_unit_eur, Math.min(...costs), Math.max(...costs)),
      certainty: p.certainty[r.stage],
    }
    const score =
      wSum > 0
        ? (w.timing * fits.timing + w.condition * fits.condition + w.co2 * fits.co2 + w.cost * fits.cost + w.certainty * fits.certainty) / wSum
        : 0
    return { ...d, fits, score }
  })

  // Waste hierarchy first, then score within the tier.
  routes.sort((a, b) => a.receiver.tier - b.receiver.tier || b.score - a.score)
  return { routes, excluded }
}
