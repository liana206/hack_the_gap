// Demo cases for the matching rules. Run: npm run test:reuse
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { rankLot } from './match.ts'
import { allocateLot, buildPlans, checkPlan, explainPlan } from './allocate.ts'
import type { Ctx, Dataset } from './types.ts'

const data: Dataset = JSON.parse(readFileSync(new URL('../../public/reuse/dataset.json', import.meta.url), 'utf8'))
const ctx = (over: Partial<Ctx> = {}): Ctx => ({
  data,
  year: 2032,
  segmented: false,
  weights: { timing: 1, condition: 1, co2: 1, cost: 1, certainty: 1 },
  ...over,
})
const lotOf = (farmId: string, item: string) => {
  const farm = data.farms.find((f) => f.id === farmId)!
  return { farm, lot: farm.lots.find((l) => l.item === item)! }
}
const ids = (xs: { receiver: { id: string } }[]) => xs.map((x) => x.receiver.id)

test('Roussas V66 blades (32 m) are too short for the greenway bridge', () => {
  const { farm, lot } = lotOf('roussas', 'blade')
  const { excluded } = rankLot(farm, lot, ctx())
  const bridge = excluded.find((e) => e.receiver.id === 'R3')!
  assert.match(bridge.reason, /Length 32 m < 40 m/)
})

test('Rocca Rossa blades: bridge excluded for grade, Montpellier for length', () => {
  const { farm, lot } = lotOf('rocca-rossa', 'blade')
  const { routes, excluded } = rankLot(farm, lot, ctx())
  assert.match(excluded.find((e) => e.receiver.id === 'R3')!.reason, /Grade B below minimum A/)
  assert.match(excluded.find((e) => e.receiver.id === 'R2')!.reason, /Length 44 m > 36 m/)
  assert.ok(ids(routes).includes('R1'), 'Palermo open call is a valid route')
})

test('routes are ranked by waste-hierarchy tier first', () => {
  const { farm, lot } = lotOf('rocca-rossa', 'blade')
  const tiers = rankLot(farm, lot, ctx()).routes.map((r) => r.receiver.tier)
  assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b))
})

test('segmenting removes whole-blade routes and lowers transport CO2', () => {
  const { farm, lot } = lotOf('rocca-rossa', 'blade')
  const whole = rankLot(farm, lot, ctx())
  const cut = rankLot(farm, lot, ctx({ segmented: true }))
  assert.ok(!ids(cut.routes).includes('R1'))
  assert.match(cut.excluded.find((e) => e.receiver.id === 'R1')!.reason, /Needs whole blades/)
  const co2 = (rs: typeof whole.routes) => rs.find((r) => r.receiver.id === 'R4')!.co2_per_unit_t
  assert.ok(co2(cut.routes) < co2(whole.routes))
})

test('every uncertain unit has a certain fallback', () => {
  const { farm, lot } = lotOf('rocca-rossa', 'blade')
  const c = ctx()
  const a = allocateLot(lot, rankLot(farm, lot, c).routes, c)
  assert.equal(a.unallocated, 0)
  assert.ok(a.uncertain_units > 0)
  assert.equal(a.fallback?.receiver.tier, 3)
})

test('a Roussas plan that only co-processes fails the French rotor quota', () => {
  const { farm, lot } = lotOf('roussas', 'blade')
  const c = ctx({ year: 2028 })
  const coproc = rankLot(farm, lot, c).routes.filter((r) => r.receiver.kind === 'coprocessing')
  const quota = checkPlan(farm, lot, allocateLot(lot, coproc, c), c, false).find((x) => x.id === 'fr-quota')!
  assert.equal(quota.ok, false)
  const full = checkPlan(farm, lot, allocateLot(lot, rankLot(farm, lot, c).routes, c), c, false)
  assert.equal(full.find((x) => x.id === 'fr-quota')!.ok, true)
})

test('Cers sign-off is blocked until the co-owner approves', () => {
  const { farm, lot } = lotOf('cers', 'blade')
  const c = ctx()
  const a = allocateLot(lot, rankLot(farm, lot, c).routes, c)
  assert.equal(checkPlan(farm, lot, a, c, false).find((x) => x.id === 'co-owner')!.ok, false)
  assert.equal(checkPlan(farm, lot, a, c, true).find((x) => x.id === 'co-owner')!.ok, true)
})

test('waste lots: storage limit and cross-border notification', () => {
  const { farm, lot } = lotOf('monte-mele', 'blade') // item_status: waste, free from 2030
  const { routes, excluded } = rankLot(farm, lot, ctx({ year: 2027 }))
  assert.match(excluded.find((e) => e.receiver.id === 'R4')!.reason, /counts as landfill/)
  const spain = routes.find((r) => r.receiver.id === 'R8')!
  assert.equal(spain.notification, true)
  const italy = routes.find((r) => r.receiver.id === 'R9')!
  assert.equal(italy.notification, false)
})

test('open calls close after their deadline', () => {
  const { farm, lot } = lotOf('rocca-rossa', 'blade')
  const { excluded } = rankLot(farm, lot, ctx({ year: 2034 }))
  assert.match(excluded.find((e) => e.receiver.id === 'R1')!.reason, /Call closed in 2033/)
})

test('electrical components only go to compatible wind farms', () => {
  const { farm, lot } = lotOf('roussas', 'electrical')
  const { routes, excluded } = rankLot(farm, lot, ctx({ year: 2028 }))
  assert.ok(ids(routes).includes('R12'))
  assert.match(excluded.find((e) => e.receiver.id === 'R11')!.reason, /Not compatible with V66/)
})

test('recommended plan keeps more embodied energy than the cheapest plan', () => {
  const { farm, lot } = lotOf('rocca-rossa', 'blade')
  const c = ctx()
  const { routes, excluded } = rankLot(farm, lot, c)
  const plans = buildPlans(lot, routes, c)
  const rec = plans.find((p) => p.id === 'recommended')!
  const cheap = plans.find((p) => p.id === 'cheapest')!
  assert.ok(rec.totals.embodied_kept_gj > cheap.totals.embodied_kept_gj)
  assert.ok(rec.totals.embodied_kept_gj <= rec.totals.embodied_total_gj)
  assert.ok(explainPlan(rec, plans, excluded, lot).length >= 3)
})

test('lowest-risk plan only uses selected or contracted demand', () => {
  const { farm, lot } = lotOf('rocca-rossa', 'blade')
  const c = ctx()
  const safe = buildPlans(lot, rankLot(farm, lot, c).routes, c).find((p) => p.id === 'low_risk')!
  assert.ok(safe.allocation.lines.every((l) => ['selected', 'contracted'].includes(l.route.receiver.stage)))
  assert.equal(safe.totals.certainty, 1)
})
