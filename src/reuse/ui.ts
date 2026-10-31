// Labels, colours and URL state shared by the reuse components.

import type { Dataset, Item, LocType, PlanId, Stage, Tier, Weights } from './types.ts'
import { isFlagged } from './match.ts'

export const ITEM_LABEL: Record<Item, string> = { blade: 'Rotor blades', steel: 'Tower steel', electrical: 'Electrical components' }
export const UNIT_LABEL: Record<Item, string> = { blade: 'blades', steel: 'tower sections', electrical: 'drivetrain sets' }
export const TIER_LABEL: Record<Tier, string> = { 1: 'Reuse as-is', 2: 'Repurpose', 3: 'Recycle', 4: 'Recover' }
export const STAGE_LABEL: Record<Stage, string> = {
  announced: 'Announced',
  call_open: 'Call open',
  selected: 'Selected / tendered',
  contracted: 'Contracted',
}
export const TYPE_LABEL: Record<LocType, string> = {
  farm: 'Alpiq wind farm',
  hub: 'Storage hub',
  open_call: 'Open call',
  infrastructure: 'Infrastructure project',
  street_furniture: 'Street furniture',
  construction: 'Construction site',
  wind_farm: 'Other wind farm',
  factory: 'Factory',
  recycler: 'Recycler',
  coprocessing: 'Co-processing',
}
export const COUNTRY_LABEL: Record<string, string> = {
  IT: 'Italy', FR: 'France', CH: 'Switzerland', SE: 'Sweden', ES: 'Spain', DE: 'Germany', NL: 'Netherlands', DK: 'Denmark',
}

// Map colours by location type (handover: blue farm, amber hub, green construction, purple wind farm, grey factory).
export const TYPE_COLOR: Record<LocType, string> = {
  farm: '#2a78d6',
  hub: '#d97706',
  open_call: '#16a34a',
  infrastructure: '#16a34a',
  street_furniture: '#16a34a',
  construction: '#16a34a',
  wind_farm: '#7c3aed',
  factory: '#64748b',
  recycler: '#64748b',
  coprocessing: '#64748b',
}
// Route colours by allocation order (first = largest share in the plan).
export const ROUTE_COLORS = ['#059669', '#0d9488', '#0284c7', '#7c3aed', '#c2410c', '#a16207']

// Legend groups: what each marker colour means, shown in the floating card.
export const LEGEND: { key: string; label: string; types: LocType[]; shape: 'circle' | 'square' | 'diamond'; text: string }[] = [
  { key: 'farm', label: 'Alpiq wind farm', types: ['farm'], shape: 'circle',
    text: 'Donor site. Items are dismantled here; condition data comes from the farm\'s sensor and maintenance record. An orange ring means the farm is inside the 4-year planning window.' },
  { key: 'hub', label: 'Storage hub', types: ['hub'], shape: 'square',
    text: 'Interim storage near the farm. Items wait here after dismantling until a destination is confirmed, so leg 2 is planned only once a receiver says yes.' },
  { key: 'build', label: 'Construction / infrastructure / open call', types: ['open_call', 'infrastructure', 'street_furniture', 'construction'], shape: 'diamond',
    text: 'Second-life uses in buildings and public works: architecture open calls, planned bridges, noise barriers, street furniture. Pseudo targets modelled on real projects.' },
  { key: 'windfarm', label: 'Other wind farm', types: ['wind_farm'], shape: 'diamond',
    text: 'Operating farms that reuse compatible generators, converters and other electrical components as spares (tier 1, reuse as-is).' },
  { key: 'industry', label: 'Factory / recycler / co-processing', types: ['factory', 'recycler', 'coprocessing'], shape: 'diamond',
    text: 'Fallback routes: steel mills, material recyclers and cement co-processing. Always available, lower in the waste hierarchy.' },
]

export const DEFAULT_WEIGHTS: Weights = { timing: 1, condition: 1, co2: 1, cost: 1, certainty: 1 }

export type Card = { kind: 'entity'; id: string } | { kind: 'legend'; key: string }

export interface ViewState {
  year: number
  lotId: string | null
  plan: PlanId
  seg: boolean
  w: Weights
  card: Card | null
}

// One row per map location, so farms, hubs and receivers are drawn alike.
export interface Entity {
  id: string
  name: string
  type: LocType
  country: string
  lat: number
  lon: number
  flagged?: boolean
}

export function entities(data: Dataset, year: number): Entity[] {
  const w = data.params.planning_window_years
  return [
    ...data.farms.map((f) => ({ id: f.id, name: f.name, type: 'farm' as const, country: f.country, lat: f.lat, lon: f.lon, flagged: isFlagged(f, year, w) })),
    ...data.hubs.map((h) => ({ id: h.id, name: h.name, type: 'hub' as const, country: h.country, lat: h.lat, lon: h.lon })),
    ...data.receivers.map((r) => ({ id: r.id, name: r.name, type: r.kind, country: r.country, lat: r.lat, lon: r.lon })),
  ]
}

// ---- URL state: #/map?year=..&lot=..&plan=..&seg=1&w=..&card=e:R3

const PLANS: PlanId[] = ['recommended', 'low_risk', 'cheapest']

export function parseHash(hash: string, fallbackYear: number): ViewState {
  const q = new URLSearchParams(hash.split('?')[1] ?? '')
  const w = (q.get('w') ?? '').split(',').filter(Boolean).map(Number)
  const card = q.get('card')
  const plan = q.get('plan') as PlanId
  return {
    year: Number(q.get('year')) || fallbackYear,
    lotId: q.get('lot'),
    plan: PLANS.includes(plan) ? plan : 'recommended',
    seg: q.get('seg') === '1',
    w: w.length === 5 && w.every((x) => !Number.isNaN(x))
      ? { timing: w[0], condition: w[1], co2: w[2], cost: w[3], certainty: w[4] }
      : DEFAULT_WEIGHTS,
    card: card?.startsWith('e:') ? { kind: 'entity', id: card.slice(2) } : card?.startsWith('l:') ? { kind: 'legend', key: card.slice(2) } : null,
  }
}

export function toHash(s: ViewState): string {
  const q = new URLSearchParams()
  q.set('year', String(s.year))
  if (s.lotId) q.set('lot', s.lotId)
  if (s.plan !== 'recommended') q.set('plan', s.plan)
  if (s.seg) q.set('seg', '1')
  const w = s.w
  if (Object.values(w).some((x) => x !== 1)) q.set('w', [w.timing, w.condition, w.co2, w.cost, w.certainty].join(','))
  if (s.card) q.set('card', s.card.kind === 'entity' ? `e:${s.card.id}` : `l:${s.card.key}`)
  return `#/map?${q}`
}

export const fmtEur = (v: number) =>
  Math.abs(v) >= 1e6 ? `€${(v / 1e6).toFixed(2)} M` : Math.abs(v) >= 1e3 ? `€${Math.round(v / 1e3)} k` : `€${Math.round(v)}`
export const fmtT = (v: number) => (Math.abs(v) >= 100 ? `${Math.round(v)} t` : `${v.toFixed(1)} t`)
export const fmtGJ = (v: number) =>
  Math.abs(v) >= 10000 ? `${(v / 1000).toFixed(1)} TJ` : `${Math.round(v).toLocaleString('en')} GJ`
