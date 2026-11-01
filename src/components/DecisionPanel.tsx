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
    <div className="card p-7">
      <h3 className="text-3xl font-extrabold tracking-tight text-navy">Your call</h3>
      <p className="mt-1 text-lg text-slate-700">
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
              className={`rounded-xl border-2 p-5 text-left transition-colors ${
                on ? 'border-accent bg-accent-soft' : 'border-transparent bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Icon id={a.id} on={on} />
              <div className="mt-3 text-xl font-bold text-navy">{a.title}</div>
              <div className="mt-1 text-base text-slate-700">{a.detail}</div>
            </button>
          )
        })}
      </div>

      {askReason && (
        <>
          <label className="mt-5 block">
            <span className="text-lg font-bold text-navy">What in the data made you decide this?</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. the measured temperature is drifting above the expected line while power is normal…"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-base text-slate-600">
              {reason.trim().length < MIN_REASON ? `Write at least ${MIN_REASON} characters.` : 'Ready.'}
            </span>
            <button
              disabled={!ready}
              onClick={() => choice && onSubmit(choice, reason.trim())}
              className="rounded-lg bg-accent px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-accent-ink active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
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
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" className={on ? 'text-accent' : 'text-teal'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[id]} />
    </svg>
  )
}
