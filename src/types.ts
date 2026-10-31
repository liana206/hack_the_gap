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
  turbine: { name: string; farm: string; age_years: number; design_life_years: number; rated_kw: number }
  component: string
  decision_date: string
  briefing: string
  alarms: { t: string; text: string }[]
  costs: { maintenance_eur: number; dismantle_eur: number; downtime_per_day_eur: number }
  series: {
    t: string[]
    history_len: number // index < history_len is visible before the decision
    component_temp: number[]
    component_expected: number[]
    power_kw: number[]
    wind_ms: number[]
    ambient_c: number[]
  }
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

// One played case, stored in localStorage
export interface LogEntry {
  caseId: string
  week: number
  decision: Answer
  reason: string
  correct: boolean
  time: string // ISO timestamp
}

export const ANSWERS: { id: Answer; title: string; detail: string }[] = [
  { id: 'ok', title: 'Nothing is wrong', detail: 'Keep running, no action needed.' },
  { id: 'maintenance', title: 'Call maintenance', detail: 'Send a crew to inspect or replace the part.' },
  { id: 'dismantle', title: 'Dismantle the turbine', detail: 'End of life is near, repair not worth it.' },
]
