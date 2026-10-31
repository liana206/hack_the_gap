import { useState } from 'react'
import { ANSWERS, type Answer } from '../types'

export const MIN_REASON = 15

interface Props {
  askReason: boolean // weeks with thinkFirst: write a reason, then lock in. Otherwise a click decides.
  onSubmit: (d: Answer, reason: string) => void
}

export default function DecisionPanel({ askReason, onSubmit }: Props) {
  const [choice, setChoice] = useState<Answer | null>(null)
  const [reason, setReason] = useState('')
  const ready = choice !== null && reason.trim().length >= MIN_REASON

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-navy">Your call</h3>
      <p className="text-sm text-slate-500">
        {askReason ? 'You decide. The senior only comments after you commit.' : 'You decide: click your answer. The senior then explains the case.'}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {ANSWERS.map((a) => {
          const on = choice === a.id
          return (
            <button
              key={a.id}
              onClick={() => (askReason ? setChoice(a.id) : onSubmit(a.id, ''))}
              aria-pressed={on}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                on ? 'border-accent bg-accent-soft shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon id={a.id} on={on} />
              <div className={`mt-3 font-semibold ${on ? 'text-accent' : 'text-slate-800'}`}>{a.title}</div>
              <div className="mt-0.5 text-sm text-slate-500">{a.detail}</div>
            </button>
          )
        })}
      </div>

      {askReason && (
        <>
          <label className="mt-5 block">
            <span className="text-sm font-medium text-slate-700">What in the data made you decide this?</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. the measured temperature is drifting above the expected line while power is normal…"
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {reason.trim().length < MIN_REASON ? `Write at least ${MIN_REASON} characters.` : 'Ready.'}
            </span>
            <button
              disabled={!ready}
              onClick={() => choice && onSubmit(choice, reason.trim())}
              className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lock in decision
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Simple stroke icons (no emoji: projector laptops often lack an emoji font)
const PATHS: Record<Answer, string> = {
  ok: 'M5 12.5l4.5 4.5L19 7.5',
  maintenance: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  dismantle: 'M12 3v6M12 9l-7 4M12 9l7 4M12 9v12M8 21h8',
}

function Icon({ id, on }: { id: Answer; on: boolean }) {
  return (
    <span className={`grid h-10 w-10 place-items-center rounded-xl ${on ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500'}`}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={PATHS[id]} />
      </svg>
    </span>
  )
}
