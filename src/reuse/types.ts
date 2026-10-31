// Reuse Matching Map: data types. Rules in docs/reuse-rules-and-data.md.
// Farms use real public specs; lots, hubs, receivers and params are pseudo data.

export type Item = 'blade' | 'steel' | 'electrical'
export type Grade = 'A' | 'B' | 'C'
export type Tier = 1 | 2 | 3 | 4 // 1 reuse as-is, 2 repurpose, 3 recycle, 4 recover
export type Stage = 'announced' | 'call_open' | 'selected' | 'contracted'
export type ReceiverKind =
  | 'open_call'
  | 'infrastructure'
  | 'street_furniture'
  | 'construction'
  | 'wind_farm'
  | 'factory'
  | 'recycler'
  | 'coprocessing'
export type LocType = 'farm' | 'hub' | ReceiverKind

export interface Lot {
  id: string
  item: Item
  quantity: number // units: blades, tower sections or drivetrain sets
  unit_mass_t: number
  length_m?: number // blades: length; steel: section length
  diameter_m?: number // steel sections
  model?: string // electrical: turbine model it fits
  grade: Grade
  repairs: string
  passport_pct: number
  item_status: 'product' | 'waste' // input from the sensor/maintenance data later
  has_geometry_model?: boolean // 3D blade model in the passport (open calls ask for it)
}

export interface Farm {
  id: string
  name: string
  country: string
  place: string
  lat: number
  lon: number
  model: string
  turbines: number
  mw: number
  commissioned: number
  end_of_life: number // estimated: commissioned + 25 years
  alpiq_share: number // 0..1; below 1 the co-owner must approve
  regime: 'FR_2020' | 'none' // FR_2020: French rotor quota applies
  assumed?: string // what is assumed, not published
  source: string
  lots: Lot[]
}

export interface Hub {
  id: string
  name: string
  country: string
  lat: number
  lon: number
  capacity: Record<Item, number> // units
  licensed_for_waste: boolean
}

export interface Receiver {
  id: string
  name: string
  kind: ReceiverKind
  country: string
  lat: number
  lon: number
  item: Item
  tier: Tier
  stage: Stage
  quantity_min: number
  quantity_max: number
  needed_by: number | null // null = takes material any time
  deadline?: number // open call: submission closes this year
  min_grade: Grade
  min_passport_pct?: number
  length_min?: number
  length_max?: number
  diameter_min?: number
  diameter_max?: number
  models?: string[] // electrical: compatible turbine models
  needs_whole_blade?: boolean
  needs_geometry_model?: boolean
  approval_months?: number // structural approval before building
  avoided_co2_per_t: number // placeholder, t CO2 per t of material
  description: string
  precedent?: { label: string; url: string }
}

export interface Params {
  road_factor: number
  planning_window_years: number
  storage_limit_years_waste: number
  notification_months: number
  ef_kg_per_km: { standard: number; oversize: number }
  rate_eur_per_km: { standard: number; oversize: number }
  truck_payload_t: number
  blades_per_truck_segmented: number
  cutting_eur_per_blade: number
  permit_eur_per_country: number
  certainty: Record<Stage, number>
  fr_rotor_quota: number
  embodied_mj_per_kg: Record<Item, number> // placeholder, order of magnitude of the ICE database
  embodied_retention: Record<Item, [number, number, number, number]> // share kept per tier 1..4
  transport_mj_per_km: { standard: number; oversize: number }
  assumptions_note: string
}

export interface Dataset {
  farms: Farm[]
  hubs: Hub[]
  receivers: Receiver[]
  params: Params
}

export interface Weights {
  timing: number
  condition: number
  co2: number
  cost: number
  certainty: number
}

export interface Ctx {
  data: Dataset
  year: number // planning date
  segmented: boolean
  weights: Weights
}

export interface Leg {
  from: [number, number]
  to: [number, number]
  km: number
}

export interface Route {
  receiver: Receiver
  hub: Hub
  leg1: Leg
  leg2: Leg
  oversize: boolean
  trucks_per_unit: number
  co2_per_unit_t: number
  cost_per_unit_eur: number
  avoided_per_unit_t: number
  embodied_kept_per_unit_gj: number // embodied energy the route keeps in use
  transport_per_unit_gj: number
  countries: string[]
  notification: boolean
  fits: { timing: number; condition: number; co2: number; cost: number; certainty: number }
  score: number
  badges: Badge[]
}

export interface Badge {
  text: string
  source: 'law' | 'policy' | 'assumption'
}

export interface Exclusion {
  receiver: Receiver
  reason: string
  source: 'law' | 'policy' | 'spec'
}

export interface Allocation {
  lines: { route: Route; units: number }[]
  unallocated: number
  uncertain_units: number // units on routes with certainty < 1
  fallback: Route | null // certainty-1 route that catches uncertain units
}

export type PlanId = 'recommended' | 'low_risk' | 'cheapest'

export interface Plan {
  id: PlanId
  name: string
  rule: string // how the plan was built, one line
  allocation: Allocation
  totals: PlanTotals
}

export interface PlanTotals {
  co2_t: number
  cost_eur: number
  avoided_t: number
  net_t: number
  embodied_kept_gj: number
  embodied_total_gj: number // embodied energy of the whole lot
  transport_gj: number
  reuse_units: number // units in tier 1-2
  certainty: number // unit-weighted demand certainty 0..1
}

export interface Check {
  id: string
  label: string
  ok: boolean
  detail: string
  source: 'law' | 'policy' | 'data'
  blocking: boolean
}
