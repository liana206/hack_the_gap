import type { LogEntry, ScenarioIndexEntry } from '../types'
import Mark from './Mark'

interface Props {
  cases: ScenarioIndexEntry[]
  selected: string | null
  lastResult: Record<string, LogEntry>
  onSelect: (id: string) => void
}

export default function CaseList({ cases, selected, lastResult, onSelect }: Props) {
  return (
    <ul className="space-y-1">
      {cases.map((c) => {
        const res = lastResult[c.id]
        const active = c.id === selected
        return (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c.id)}
              aria-current={active ? 'true' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                active ? 'bg-accent text-white' : 'hover:bg-slate-50'
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-base ${
                  !res
                    ? active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-400'
                    : res.correct
                      ? active ? 'bg-white text-accent' : 'bg-teal text-white'
                      : active ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-700'
                }`}
                aria-label={!res ? 'not played' : res.correct ? 'correct' : 'wrong'}
              >
                {!res ? '·' : <Mark kind={res.correct ? 'check' : 'cross'} />}
              </span>
              <span className="min-w-0">
                <span className={`block text-base font-bold leading-snug ${active ? 'text-white' : 'text-navy'}`}>
                  {c.title}
                </span>
                <span className={`text-sm ${active ? 'text-white/90' : 'text-teal'}`}>Stage {c.week}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
