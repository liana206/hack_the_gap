import type { LogEntry, ScenarioIndexEntry } from '../types'

interface Props {
  cases: ScenarioIndexEntry[]
  selected: string | null
  lastResult: Record<string, LogEntry>
  onSelect: (id: string) => void
}

export default function CaseList({ cases, selected, lastResult, onSelect }: Props) {
  return (
    <ul className="space-y-1.5">
      {cases.map((c) => {
        const res = lastResult[c.id]
        const active = c.id === selected
        return (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                active ? 'bg-accent-soft ring-1 ring-accent/40' : 'hover:bg-slate-50'
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  !res
                    ? 'bg-slate-100 text-slate-400'
                    : res.correct
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                }`}
                aria-label={!res ? 'not played' : res.correct ? 'correct' : 'wrong'}
              >
                {!res ? '·' : res.correct ? '✓' : '✗'}
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-sm font-medium ${active ? 'text-navy' : 'text-slate-700'}`}>
                  {c.title}
                </span>
                <span className="text-xs text-slate-400">Stage {c.week}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
