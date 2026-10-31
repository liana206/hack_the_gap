// Turbine-level view: each turbine retires in its own year and its components are matched as small lots.
// Turbines with a record (e.g. diagnosed in the Week 1–2 cases) use it; the others get a deterministic
// pseudo spread of −3…+4 years around the farm's end of life, so the same data gives the same turbines.

import type { Dataset, Farm, Grade, Lot, TurbineRecord } from './types.ts'

export interface Turbine {
  id: string // "T01"
  farm: Farm
  retire_year: number
  reason: string
  commissioned: number
  gym_case?: string
  generated: boolean // true = pseudo spread, no record
  lots: Lot[]
}

const GRADES: Grade[] = ['A', 'B', 'C']
const worse = (g: Grade, steps: number) => GRADES[Math.min(2, GRADES.indexOf(g) + steps)]

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const EARLY_REASONS = [
  'Main-bearing wear; life extension not approved (pseudo)',
  'Blade root crack; repair uneconomic (pseudo)',
  'Gearbox at end of life; replacement not worth it before repowering (pseudo)',
]

const cache = new WeakMap<Farm, Turbine[]>()

export function turbinesOf(farm: Farm): Turbine[] {
  const hit = cache.get(farm)
  if (hit) return hit
  const list: Turbine[] = []
  for (let i = 1; i <= farm.turbines; i++) {
    const id = `T${String(i).padStart(2, '0')}`
    const rec: TurbineRecord | undefined = farm.turbine_records?.find((r) => r.id === id)
    const h = hash(farm.id + id)
    const offset = (h % 8) - 3
    const retire_year = rec?.retire_year ?? farm.end_of_life + offset
    const extraWear = !rec && offset <= -2 ? 1 : 0
    list.push({
      id,
      farm,
      retire_year,
      reason: rec?.reason ?? (offset < 0 ? EARLY_REASONS[h % EARLY_REASONS.length] : 'Reaches end of design life (pseudo)'),
      commissioned: rec?.commissioned ?? farm.commissioned,
      gym_case: rec?.gym_case,
      generated: !rec,
      lots: farm.lots.map((l) => ({
        ...l,
        id: `${farm.id}:${id}:${l.item}`,
        quantity: Math.max(1, Math.round(l.quantity / farm.turbines)),
        grade: rec?.grades?.[l.item] ?? worse(l.grade, extraWear),
        repairs: rec?.notes?.[l.item] ?? l.repairs,
        item_status: rec?.item_status ?? l.item_status,
        available_year: retire_year,
        pooled: true,
        turbine: id,
      })),
    })
  }
  list.sort((a, b) => a.retire_year - b.retire_year || a.id.localeCompare(b.id))
  cache.set(farm, list)
  return list
}

export const firstRetire = (farm: Farm) => turbinesOf(farm)[0]?.retire_year ?? farm.end_of_life

// A turbine is "due" once its retire year is inside the planning window.
export const isDue = (t: Turbine, year: number, windowYears: number) => year >= t.retire_year - windowYears

export function findLot(data: Dataset, lotId: string): { farm: Farm; lot: Lot; turbine?: Turbine } | null {
  for (const farm of data.farms) {
    const lot = farm.lots.find((l) => l.id === lotId)
    if (lot) return { farm, lot }
    for (const t of turbinesOf(farm)) {
      const tl = t.lots.find((l) => l.id === lotId)
      if (tl) return { farm, lot: tl, turbine: t }
    }
  }
  return null
}

export function turbineByCase(data: Dataset, caseId: string): Turbine | null {
  for (const farm of data.farms) {
    const t = turbinesOf(farm).find((x) => x.gym_case === caseId)
    if (t) return t
  }
  return null
}
