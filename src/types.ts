// Shared types. The JSON format is documented in pipeline/README.md.

export type Answer = 'ok' | 'maintenance' | 'dismantle'

export interface ScenarioIndexEntry {
  id: string
  week: number
  title: string
}

export interface Scenario {
  id: string
  week: number
  title: string
  source: 'synthetic' // all cases are hand-designed fake data
  turbine: {
    name: string
    farm: string
    age_years: number
    design_life_years: number
    rated_kw: number
    remaining_life_years: number // until design life + extension, or until repowering
    annual_margin_eur: number // revenue minus O&M per year
    under_warranty: boolean
    repowering_in_years: number | null // null = no repowering planned
  }
  component: string
  decision_date: string
  briefing: string
  alarms: { t: string; text: string }[]
  costs: {
    maintenance_eur: number // 0 when under warranty
    maintenance_list_price_eur: number
    dismantle_eur: number
    resale_parts_eur: number // intact parts, if dismantled now
    downtime_per_day_eur: number
  }
  series: {
    t: string[]
    history_len: number // index < history_len is visible before the decision
    component_temp: number[]
    component_expected: number[]
    gap_24h: number[] // 24 h trailing mean of measured - expected (°C)
    power_kw: number[]
    wind_ms: number[]
    ambient_c: number[]
  }
  challenge?: { stance: Answer; text: string; points: string[] } // Sandra's scripted argument before the reveal; a trap if stance is wrong
  truth: {
    answer: Answer
    outcome: string
    explanation: string
    cost_if: Record<Answer, number>
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// What happened in the debate before the reveal. Feedback only: it never changes the score.
export interface Debate {
  said: string // everything the junior replied
  rounds: number
  open: string[] // Sandra's arguments still unanswered when the junior locked in
  checked: boolean // false if Gemini was unavailable, so the replies were not checked
}

// One played case, stored in localStorage
export interface LogEntry {
  caseId: string
  week: number
  decision: Answer
  reason: string
  correct: boolean
  detail?: number // detail grade points for the written reason, if there was one
  firstDecision?: Answer // the call before Sandra's challenge, if there was one
  debate?: Debate
  trap?: boolean // Sandra's challenge was wrong on purpose
  time: string // ISO timestamp
}

export const ANSWERS: { id: Answer; title: string; detail: string }[] = [
  { id: 'ok', title: 'Nothing is wrong', detail: 'Keep running, no action needed.' },
  { id: 'maintenance', title: 'Call maintenance', detail: 'Send a crew to inspect or replace the part.' },
  { id: 'dismantle', title: 'Dismantle the turbine', detail: 'End of life is near, repair not worth it.' },
]
