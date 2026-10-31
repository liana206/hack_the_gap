// Senior engineer "Sandra". She never sees raw arrays: we compute a short text summary in code.
// Week 1: she only speaks after the reveal, so she may see the truth.
// From week 2 on (strictSenior), the prompt must be built WITHOUT the truth before the reveal.

import type { Answer, ChatMessage, Scenario } from './types'
import { ANSWERS } from './types'
import type { Week } from './weeks'

const label = (a: Answer) => ANSWERS.find((x) => x.id === a)!.title

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const r1 = (x: number) => Math.round(x * 10) / 10

/** Least-squares slope of ys per step. */
function slope(ys: number[]): number {
  const n = ys.length
  const mx = (n - 1) / 2
  const my = mean(ys)
  let num = 0
  let den = 0
  ys.forEach((y, i) => {
    num += (i - mx) * (y - my)
    den += (i - mx) ** 2
  })
  return den ? num / den : 0
}

/** Facts about the VISIBLE history only (what the junior could see). No truth in here. */
export function summarizeHistory(s: Scenario): string {
  const { series: S, turbine: T } = s
  const h = S.history_len
  const gap = S.component_temp.slice(0, h).map((v, i) => v - S.component_expected[i])
  const week = 7 * 24
  const temps = S.component_temp.slice(0, h)
  const power = S.power_kw.slice(0, h)
  const ambient = S.ambient_c.slice(0, h)
  const alarms = s.alarms.filter((a) => a.t <= S.t[h - 1])

  return [
    `Turbine ${T.name} (${T.farm}), ${T.rated_kw} kW, age ${T.age_years} y of ${T.design_life_years} y design life.`,
    `Component watched: ${s.component}. Decision date: ${s.decision_date.slice(0, 10)}.`,
    `Briefing: ${s.briefing}`,
    `Temperature gap (measured minus expected): first week avg ${r1(mean(gap.slice(0, week)))} °C, ` +
      `last 3 days avg ${r1(mean(gap.slice(h - 72)))} °C, last 24 h avg ${r1(mean(gap.slice(h - 24)))} °C, ` +
      `trend over last week ${r1(slope(gap.slice(h - week)) * 24)} °C/day.`,
    `Measured temperature max ${r1(Math.max(...temps))} °C. Outside temperature ${r1(Math.min(...ambient))} to ${r1(Math.max(...ambient))} °C.`,
    `Average power ${Math.round(mean(power))} kW (${Math.round((mean(power) / T.rated_kw) * 100)} % of rated).`,
    `Alarms: ${alarms.length ? alarms.map((a) => `${a.t.slice(0, 16).replace('T', ' ')} ${a.text}`).join('; ') : 'none'}.`,
    `Costs: maintenance ${s.costs.maintenance_eur} EUR, dismantle ${s.costs.dismantle_eur} EUR, downtime ${s.costs.downtime_per_day_eur} EUR/day.`,
  ].join('\n')
}

/** The truth block. Only include it after the reveal. */
export function summarizeTruth(s: Scenario): string {
  return [
    `Correct answer: ${label(s.truth.answer)}.`,
    `What happened: ${s.truth.outcome}`,
    `Why: ${s.truth.explanation}`,
  ].join('\n')
}

const STYLE: Record<Week['seniorStyle'], string> = {
  coach: 'You are friendly and encouraging, like a good mentor. Praise what was right, correct gently.',
  strict: 'You are demanding. Ask for evidence, point out gaps in reasoning, never give the answer away.',
  devil: 'You argue the opposite position to test whether the junior can defend a correct call.',
}

export function buildSystemPrompt(
  week: Week,
  s: Scenario,
  decision: Answer,
  reason: string,
  revealed: boolean,
): string {
  return [
    'You are Sandra, a senior wind turbine maintenance engineer coaching a junior asset manager in a training simulator.',
    STYLE[week.seniorStyle],
    'Rules: plain language, no markdown headings, max 120 words.',
    'First reply: (1) was the call right, (2) the ONE signal in the data that mattered most, (3) one rule of thumb.',
    'Follow-up replies: answer the question briefly, refer to the facts below, do not invent numbers.',
    'The "expected" temperature comes from a normal-behaviour model: 32 + 0.011 * power_kw + 0.85 * outside temperature.',
    '',
    'CASE FACTS (computed from the data the junior saw):',
    summarizeHistory(s),
    '',
    revealed ? `TRUTH (revealed):\n${summarizeTruth(s)}` : 'The outcome is NOT known yet. Do not guess it.',
    '',
    `JUNIOR'S DECISION: ${label(decision)}`,
    `JUNIOR'S REASON: ${reason}`,
  ].join('\n')
}

/** Offline fallback so the demo never breaks: built from the scenario, no LLM. */
export function offlineFeedback(s: Scenario, decision: Answer, why = 'no Gemini key set'): string {
  const right = decision === s.truth.answer
  return (
    (right ? 'Good call. ' : `Not quite: the right call was "${label(s.truth.answer)}". `) +
    s.truth.explanation +
    ' Rule of thumb: judge the gap between measured and expected temperature, not the raw temperature.' +
    `\n\n(Offline mode: ${why}, this is a built-in reply.)`
  )
}

/** Calls our dev-server proxy. Returns null if no key is configured (placeholder mode). */
export async function askSenior(system: string, messages: ChatMessage[]): Promise<string | null> {
  const r = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages }),
  })
  const data = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
  if (data.placeholder) return null
  if (data.error) throw new Error(data.error)
  return data.text || '(empty reply)'
}
