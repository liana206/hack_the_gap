import { useEffect, useMemo, useState } from 'react'
import CaseFacts from './components/CaseFacts'
import CaseDeck from './components/CaseDeck'
import ChallengePanel from './components/ChallengePanel'
import { ConditionsChart, GapChart, TemperatureChart } from './components/Charts'
import DecisionPanel from './components/DecisionPanel'
import Mark from './components/Mark'
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

const caseWeek = (hash: string) => {
  const w = hash.match(/^#\/case\/w(\d)-/)?.[1]
  return w ? Number(w) : null
}

export default function App() {
  // Links between weeks: #/map?... opens the week 4 reuse map, #/case/<id> opens that case in its own week.
  const [weekN, setWeekN] = useState(() => (/^#\/map/.test(location.hash) ? 4 : caseWeek(location.hash) ?? 1))
  const [index, setIndex] = useState<ScenarioIndexEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(() => location.hash.match(/^#\/case\/([\w-]+)/)?.[1] ?? null)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [log, setLog] = useState<LogEntry[]>(loadLog)
  const [pending, setPending] = useState<{ decision: Answer; reason: string } | null>(null) // waiting for the final call
  const [error, setError] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(() => /^#\/map/.test(location.hash))

  useEffect(() => {
    const onHash = () => {
      if (/^#\/map/.test(location.hash)) {
        setWeekN(4)
        setMapOpen(true)
      }
      const c = location.hash.match(/^#\/case\/([\w-]+)/)?.[1]
      if (c) {
        setWeekN(caseWeek(location.hash) ?? 2)
        setMapOpen(false)
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
    setPending(null)
    fetch(`/scenarios/${selectedId}.json`)
      .then((r) => r.json())
      .then(setScenario)
      .catch(() => setError(`Could not load scenario ${selectedId}`))
  }, [selectedId])

  useEffect(() => {
    setPending(null)
    // Each week has its own cases: open the first one when the current case is not in this week.
    setSelectedId((id) => (cases.length && !cases.some((c) => c.id === id) ? cases[0].id : id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekN, index])

  useEffect(() => localStorage.setItem(LOG_KEY, JSON.stringify(log)), [log])

  function closeMap() {
    setMapOpen(false)
  }

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

  // The case shows its result exactly when the ✓/✗ mark does: both come from the saved log,
  // so the result survives a reload or a case switch, and reset clears both.
  const entry = scenario ? lastResult[scenario.id] : undefined
  // Entries saved before the debate had missing/satisfied lack them: fill in so the reveal does not crash.
  const played = entry && {
    ...entry,
    debate: entry.debate && { ...entry.debate, missing: entry.debate.missing ?? [], satisfied: entry.debate.satisfied ?? false },
  }
  // Stage 4: a case that really ends in dismantling links from its result to the map.
  const goesToMap = !!played && week.features.secondLife && scenario?.truth.answer === 'dismantle'

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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen font-sans text-slate-800">
      <header>
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-8 pb-2 pt-8">
          <h1 className="text-[2.25rem] font-extrabold leading-none tracking-tight text-navy">From Onboarding To Ownership</h1>
          <WeekPicker
            week={weekN}
            onChange={(n) => {
              if (n === weekN) closeMap()
              else {
                setWeekN(n)
                setMapOpen(false)
              }
            }}
          />
        </div>
      </header>

      {mapOpen && (
        <>
          <div className="mx-auto flex max-w-[1900px] flex-wrap items-center justify-between gap-3 px-8 pt-3 text-base">
            <span className="text-slate-700">
              {goesToMap && played && scenario ? (
                <>
                  <b className={`inline-flex items-center gap-1 ${played.decision === 'dismantle' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    <Mark kind={played.decision === 'dismantle' ? 'check' : 'cross'} />
                    {played.decision === 'dismantle' ? 'Right call.' : 'Not the right call.'}
                  </b>{' '}
                  {scenario.turbine.name} is being dismantled. Plan where its parts go.
                </>
              ) : (
                'Second-life map'
              )}
            </span>
            <button onClick={closeMap} className="rounded-xl bg-accent px-4 py-2 text-base font-semibold text-white hover:bg-accent-ink">
              {goesToMap ? '← Back to the result and Sandra' : '← Back to the cases'}
            </button>
          </div>
          <ReuseApp />
        </>
      )}
      <div className={`mx-auto max-w-[1600px] gap-6 px-8 lg:grid-cols-[17rem_1fr] py-8 ${mapOpen ? 'hidden' : 'grid'}`}>
        <aside className="space-y-4">
          <CaseDeck cases={cases} selected={selectedId} lastResult={lastResult} onSelect={setSelectedId} />
          <div className="rounded-2xl bg-navy-2 p-5 text-white">
            <div className="text-base font-bold text-white">Learning log</div>
            <div className="mt-1 text-6xl font-extrabold tracking-tight text-white">
              {weekCorrect}
              <span className="text-3xl text-white/70">/{cases.length || '–'}</span>
            </div>
            <div className="my-3 flex gap-1.5" aria-hidden="true">
              {cases.map((c) => {
                const r = firstTry[c.id]
                return (
                  <span key={c.id} className={`grid h-7 flex-1 place-items-center rounded-md text-sm ${!r ? 'bg-white/15' : r.correct ? 'bg-accent-bright text-white' : 'bg-rose-600 text-white'}`}>
                    {r && <Mark kind={r.correct ? 'check' : 'cross'} />}
                  </span>
                )
              })}
            </div>
            <div className="text-base text-white">
              Stage {weekN}: correct on first try ({weekPlayed} played)
            </div>
            {avgDetail && <div className="mt-1 text-base text-white">Reasoning detail: {avgDetail}/7 on average</div>}
            {traps.length > 0 && <div className="mt-1 text-base text-white">Wrong AI caught: {trapsCaught}/{traps.length} traps met</div>}
            <div className="mt-3 flex items-center justify-between text-sm text-white/80">
              <span>{log.length} decisions logged</span>
              {log.length > 0 && (
                <button
                  className="underline hover:text-white"
                  onClick={() => confirm('Clear the whole learning log?') && setLog([])}
                >
                  reset
                </button>
              )}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          {error && <div className="card border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

          {!week.ready ? (
            <ComingSoon n={week.n} />
          ) : !scenario ? (
            <div className="card p-10 text-center text-slate-400">Loading case…</div>
          ) : (
            <>
              {played && <Reveal s={scenario} decision={played.decision} reason={played.reason} firstDecision={played.firstDecision} debate={played.debate} />}
              {played && <SeniorChat key={scenario.id + log.length} week={week} s={scenario} decision={played.decision} reason={played.reason} firstDecision={played.firstDecision} debate={played.debate} />}
              <CaseFacts s={scenario} figure />
              <div className="grid gap-6 2xl:grid-cols-2">
                <div className="space-y-6">
                  <TemperatureChart s={scenario} revealed={!!played} />
                  <GapChart s={scenario} revealed={!!played} showHint={week.features.readingHelp} strip />
                </div>
                <ConditionsChart s={scenario} revealed={!!played} />
              </div>
              {!played && !pending && <DecisionPanel key={`${weekN}-${scenario.id}`} askReason={week.features.thinkFirst} onSubmit={firstCall} />}
              {!played && pending && <ChallengePanel s={scenario} first={pending.decision} reason={pending.reason} onFinal={(d, debate) => decide(d, pending.reason, pending.decision, debate)} />}
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
      <div className="card-title">Stage {w.n} · coming soon</div>
      <h2 className="mt-1 text-2xl font-semibold text-navy">{w.title}</h2>
      <p className="mt-2 max-w-xl text-slate-600">{w.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {flags.map((f) => (
          <span key={f} className="rounded-full bg-teal-soft px-3 py-1 text-sm font-medium text-teal">
            {f}
          </span>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-400">Senior style: {w.seniorStyle}. Switch on in src/weeks.ts when built.</p>
    </div>
  )
}
