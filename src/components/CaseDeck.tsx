import { useEffect, useRef } from 'react'
import type { LogEntry, ScenarioIndexEntry } from '../types'
import Mark from './Mark'

interface Props {
  cases: ScenarioIndexEntry[]
  selected: string | null
  lastResult: Record<string, LogEntry>
  onSelect: (id: string) => void
}

/** Dark stacked deck of cases that slides vertically: about four show at once, the rest scroll into view. */
export default function CaseDeck({ cases, selected, lastResult, onSelect }: Props) {
  const list = useRef<HTMLUListElement>(null)
  const done = cases.filter((c) => lastResult[c.id]).length

  // Keep the selected case in view by scrolling the list only, never the page.
  useEffect(() => {
    const ul = list.current
    const li = ul?.querySelector<HTMLElement>('[aria-current="true"]')?.parentElement
    if (!ul || !li) return
    const top = li.offsetTop - ul.offsetTop // both measured from the deck card
    if (top < ul.scrollTop || top + li.offsetHeight > ul.scrollTop + ul.clientHeight) ul.scrollTo({ top, behavior: 'smooth' })
  }, [selected])

  return (
    <div className="relative pt-5">
      {/* the cards behind */}
      <div className="absolute inset-x-8 top-0 h-10 rounded-t-2xl bg-slate-400" aria-hidden="true" />
      <div className="absolute inset-x-4 top-2.5 h-10 rounded-t-2xl bg-slate-600" aria-hidden="true" />

      <div className="relative rounded-2xl bg-deck p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="text-2xl font-bold">Cases</div>
          <span className="rounded-full bg-white/15 px-3 py-0.5 text-base font-semibold tabular-nums">
            {done}/{cases.length}
          </span>
        </div>

        <ul ref={list} className="deck-scroll -mr-2 mt-3 max-h-[23rem] snap-y snap-mandatory space-y-1 overflow-y-auto overscroll-contain pr-2">
          {cases.map((c) => {
            const res = lastResult[c.id]
            const active = c.id === selected
            return (
              <li key={c.id} className="snap-start">
                <button
                  onClick={() => onSelect(c.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-white text-navy' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold leading-snug">{c.title}</span>
                    <span className={`text-sm ${active ? 'text-teal' : 'text-white/70'}`}>Stage {c.week}</span>
                  </span>
                  <Status res={res} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Status({ res }: { res?: LogEntry }) {
  if (!res)
    return <span className="h-8 w-8 shrink-0 rounded-full border-2 border-current opacity-40" aria-label="not played" />
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-base text-white ${res.correct ? 'bg-accent-bright' : 'bg-rose-600'}`}
      aria-label={res.correct ? 'correct' : 'wrong'}
    >
      <Mark kind={res.correct ? 'check' : 'cross'} />
    </span>
  )
}
