import { useEffect, useMemo, useState } from 'react'
import CaseFacts from './components/CaseFacts'
import ChallengePanel from './components/ChallengePanel'
import CaseList from './components/CaseList'
import { ConditionsChart, GapChart, TemperatureChart } from './components/Charts'
import DecisionPanel from './components/DecisionPanel'
import Reveal from './components/Reveal'
import SeniorChat from './components/SeniorChat'
import WeekPicker from './components/WeekPicker'
import ReuseApp from './reuse/ReuseApp'
import { gradeReasoning } from './senior'
import type { Answer, Debate, LogEntry, Scenario, ScenarioIndexEntry } from './types'
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
  // Links between weeks: #/map?... opens the week 4 reuse map, #/case/<id> opens that case in week 2.
  const [weekN, setWeekN] = useState(() => (/^#\/map/.test(location.hash) ? 4 : /^#\/case\//.test(location.hash) ? 2 : 1))
  const [index, setIndex] = useState<ScenarioIndexEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(() => location.hash.match(/^#\/case\/([\w-]+)/)?.[1] ?? null)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [log, setLog] = useState<LogEntry[]>(loadLog)
  const [played, setPlayed] = useState<{ decision: Answer; reason: string; firstDecision?: Answer; debate?: Debate } | null>(null)
  const [pending, setPending] = useState<{ decision: Answer; reason: string } | null>(null) // waiting for the final call
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onHash = () => {
      if (/^#\/map/.test(location.hash)) setWeekN(4)
      const c = location.hash.match(/^#\/case\/([\w-]+)/)?.[1]
      if (c) {
        setWeekN(2)
        setSelectedId(c)
        window.scrollTo({ top: 0 })
      }
    }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const week = WEEKS.find((w) => w.n === weekN)!
  const cases = index.filter((c) => c.week === weekN)

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
    setPending(null)
    fetch(`/scenarios/${selectedId}.json`)
      .then((r) => r.json())
      .then(setScenario)
      .catch(() => setError(`Could not load scenario ${selectedId}`))
  }, [selectedId])

  useEffect(() => {
    setPlayed(null)
    setPending(null)
    // Each week has its own cases: open the first one when the current case is not in this week.
    setSelectedId((id) => (cases.length && !cases.some((c) => c.id === id) ? cases[0].id : id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekN, index])

  useEffect(() => localStorage.setItem(LOG_KEY, JSON.stringify(log)), [log])

  // Latest result per case (for the ✓/✗ marks) and first-try score per week.
  const weekLog = useMemo(() => log.filter((e) => e.week === weekN), [log, weekN])
  const lastResult = useMemo(() => Object.fromEntries(weekLog.map((e) => [e.caseId, e])), [weekLog])
  const firstTry = useMemo(() => {
    const first: Record<string, LogEntry> = {}
    for (const e of weekLog) first[e.caseId] ??= e
    return first
  }, [weekLog])
  const weekCorrect = cases.filter((c) => firstTry[c.id]?.correct).length
  const weekPlayed = cases.filter((c) => firstTry[c.id]).length
  const details = cases.flatMap((c) => firstTry[c.id]?.detail ?? [])
  const avgDetail = details.length ? (details.reduce((a, b) => a + b, 0) / details.length).toFixed(1) : null
  const traps = cases.filter((c) => firstTry[c.id]?.trap)
  const trapsCaught = traps.filter((c) => firstTry[c.id].correct).length

  function firstCall(decision: Answer, reason: string) {
    if (week.features.traps && scenario?.challenge) setPending({ decision, reason })
    else decide(decision, reason)
  }

  function decide(decision: Answer, reason: string, firstDecision?: Answer, debate?: Debate) {
    if (!scenario) return
    // Score from code against the real outcome, never from the LLM.
    const correct = decision === scenario.truth.answer
    setLog((l) => [...l, { caseId: scenario.id, week: weekN, decision, reason, correct, detail: reason ? gradeReasoning(reason).points : undefined, firstDecision, debate, trap: firstDecision && scenario.challenge!.stance !== scenario.truth.answer, time: new Date().toISOString() }])
    setPending(null)
    setPlayed({ decision, reason, firstDecision, debate })
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

      {week.features.secondLife ? (
        <ReuseApp />
      ) : (
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
              <span className="text-lg text-slate-400">/{cases.length || '–'}</span>
            </div>
            <div className="text-sm text-slate-500">
              Week {weekN}: correct on first try ({weekPlayed} played)
            </div>
            {avgDetail && <div className="mt-1 text-sm text-slate-500">Reasoning detail: {avgDetail}/7 on average</div>}
            {traps.length > 0 && <div className="mt-1 text-sm text-slate-500">Wrong AI caught: {trapsCaught}/{traps.length} traps met</div>}
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
              {played && <Reveal s={scenario} decision={played.decision} reason={played.reason} firstDecision={played.firstDecision} debate={played.debate} />}
              {played && <SeniorChat key={scenario.id + log.length} week={week} s={scenario} decision={played.decision} reason={played.reason} firstDecision={played.firstDecision} debate={played.debate} />}
              <CaseFacts s={scenario} />
              <div className="grid gap-6 2xl:grid-cols-2">
                <div className="space-y-6">
                  <TemperatureChart s={scenario} revealed={!!played} />
                  <GapChart s={scenario} revealed={!!played} showHint={week.features.readingHelp} />
                </div>
                <ConditionsChart s={scenario} revealed={!!played} />
              </div>
              {!played && !pending && <DecisionPanel key={`${weekN}-${scenario.id}`} askReason={week.features.thinkFirst} onSubmit={firstCall} />}
              {!played && pending && <ChallengePanel s={scenario} first={pending.decision} reason={pending.reason} onFinal={(d, debate) => decide(d, pending.reason, pending.decision, debate)} />}
            </>
          )}
        </main>
      </div>
      )}
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
