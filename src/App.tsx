import { useEffect, useMemo, useState } from 'react'
import CaseFacts from './components/CaseFacts'
import CaseList from './components/CaseList'
import { ConditionsChart, TemperatureChart } from './components/Charts'
import DecisionPanel from './components/DecisionPanel'
import Reveal from './components/Reveal'
import SeniorChat from './components/SeniorChat'
import WeekPicker from './components/WeekPicker'
import type { Answer, LogEntry, Scenario, ScenarioIndexEntry } from './types'
import { WEEKS } from './weeks'

const LOG_KEY = 'turbine-gym-log-v1'

const loadLog = (): LogEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
  } catch {
    return []
  }
}

export default function App() {
  const [weekN, setWeekN] = useState(1)
  const [index, setIndex] = useState<ScenarioIndexEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [log, setLog] = useState<LogEntry[]>(loadLog)
  const [played, setPlayed] = useState<{ decision: Answer; reason: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const week = WEEKS.find((w) => w.n === weekN)!
  const cases = index.filter((c) => c.week <= weekN)

  useEffect(() => {
    fetch('/scenarios/index.json')
      .then((r) => r.json())
      .then((list: ScenarioIndexEntry[]) => {
        setIndex(list)
        setSelectedId((id) => id ?? list[0]?.id ?? null)
      })
      .catch(() => setError('Could not load scenarios. Run: python3 pipeline/make_mock_scenarios.py'))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setScenario(null)
    setPlayed(null)
    fetch(`/scenarios/${selectedId}.json`)
      .then((r) => r.json())
      .then(setScenario)
      .catch(() => setError(`Could not load scenario ${selectedId}`))
  }, [selectedId])

  useEffect(() => localStorage.setItem(LOG_KEY, JSON.stringify(log)), [log])

  // Latest result per case (for the ✓/✗ marks) and first-try score per week.
  const lastResult = useMemo(() => Object.fromEntries(log.map((e) => [e.caseId, e])), [log])
  const firstTry = useMemo(() => {
    const first: Record<string, LogEntry> = {}
    for (const e of log) first[e.caseId] ??= e
    return first
  }, [log])
  const weekCases = index.filter((c) => c.week === weekN)
  const weekCorrect = weekCases.filter((c) => firstTry[c.id]?.correct).length
  const weekPlayed = weekCases.filter((c) => firstTry[c.id]).length

  function decide(decision: Answer, reason: string) {
    if (!scenario) return
    // Score from code against the real outcome, never from the LLM.
    const correct = decision === scenario.truth.answer
    setLog((l) => [...l, { caseId: scenario.id, week: scenario.week, decision, reason, correct, time: new Date().toISOString() }])
    setPlayed({ decision, reason })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen font-sans text-slate-800">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">Alpiq · Hack the Gap</div>
            <h1 className="text-xl font-semibold">Turbine Judgement Gym</h1>
          </div>
          <WeekPicker week={weekN} onChange={setWeekN} />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="card p-4">
            <div className="card-title mb-3 px-1">Cases</div>
            <CaseList cases={cases} selected={selectedId} lastResult={lastResult} onSelect={setSelectedId} />
          </div>
          <div className="card p-5">
            <div className="card-title">Learning log</div>
            <div className="mt-2 text-3xl font-semibold text-navy">
              {weekCorrect}
              <span className="text-lg text-slate-400">/{weekCases.length || '–'}</span>
            </div>
            <div className="text-sm text-slate-500">
              Week {weekN}: correct on first try ({weekPlayed} played)
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>{log.length} decisions logged</span>
              {log.length > 0 && (
                <button
                  className="underline hover:text-slate-600"
                  onClick={() => confirm('Clear the whole learning log?') && setLog([])}
                >
                  reset
                </button>
              )}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          {error && <div className="card border-l-4 border-rose-400 p-4 text-sm text-rose-700">{error}</div>}

          {!week.ready ? (
            <ComingSoon n={week.n} />
          ) : !scenario ? (
            <div className="card p-10 text-center text-slate-400">Loading case…</div>
          ) : (
            <>
              {played && <Reveal s={scenario} decision={played.decision} reason={played.reason} />}
              <CaseFacts s={scenario} />
              <div className="grid gap-6 2xl:grid-cols-2">
                <TemperatureChart s={scenario} revealed={!!played} />
                <ConditionsChart s={scenario} revealed={!!played} />
              </div>
              {played ? (
                <SeniorChat key={scenario.id + log.length} week={week} s={scenario} decision={played.decision} reason={played.reason} />
              ) : (
                <DecisionPanel key={scenario.id} onSubmit={decide} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function ComingSoon({ n }: { n: number }) {
  const w = WEEKS.find((x) => x.n === n)!
  const flags = Object.entries(w.features).filter(([, on]) => on).map(([k]) => k)
  return (
    <div className="card p-10">
      <div className="card-title">Week {w.n} · coming soon</div>
      <h2 className="mt-1 text-2xl font-semibold text-navy">{w.title}</h2>
      <p className="mt-2 max-w-xl text-slate-600">{w.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {flags.map((f) => (
          <span key={f} className="rounded-full bg-accent-soft px-3 py-1 font-mono text-xs text-accent">
            {f}
          </span>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-400">Senior style: {w.seniorStyle}. Switch on in src/weeks.ts when built.</p>
    </div>
  )
}
