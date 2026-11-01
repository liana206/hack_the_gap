import { useEffect, useRef, useState } from 'react'
import { askSenior, buildSystemPrompt, offlineFeedback } from '../senior'
import type { Answer, ChatMessage, Debate, Scenario } from '../types'
import type { Week } from '../weeks'

const OPENER = 'I made my decision. Please give me your feedback.'

interface Props {
  week: Week
  s: Scenario
  decision: Answer
  reason: string
  firstDecision?: Answer
  debate?: Debate
}

export default function SeniorChat({ week, s, decision, reason, firstDecision, debate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const started = useRef(false)
  // Sandra only speaks after the reveal, so she may know the truth.
  const system = buildSystemPrompt(week, s, decision, reason, true, firstDecision, debate)

  async function send(history: ChatMessage[]) {
    setBusy(true)
    try {
      const text = await askSenior(system, history)
      if (text === null) {
        setOffline(true)
        const reply =
          history.length === 1
            ? offlineFeedback(s, decision, reason)
            : 'I am in offline mode (no GEMINI_API_KEY in .env), so I cannot answer follow-up questions.'
        setMessages([...history, { role: 'assistant', content: reply }])
      } else {
        setMessages([...history, { role: 'assistant', content: text }])
      }
    } catch (e) {
      // Gemini down or overloaded: the first feedback still works from the scenario, follow-ups can be retried.
      const msg = (e as Error).message
      const reply =
        history.length === 1
          ? offlineFeedback(s, decision, reason, `Gemini unavailable: ${msg}`)
          : `Could not reach the senior (${msg}). Try asking again in a moment.`
      setMessages([...history, { role: 'assistant', content: reply }])
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    const first: ChatMessage[] = [{ role: 'user', content: OPENER }]
    setMessages(first)
    send(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function ask() {
    const q = input.trim()
    if (!q || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setInput('')
    send(next)
  }

  return (
    <div className="card p-7">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-teal text-base font-bold text-white">SK</div>
        <div>
          <div className="text-xl font-bold text-navy">Sandra · Senior maintenance engineer</div>
          <div className="text-sm text-slate-600">
            AI coach ({week.seniorStyle} style){offline && ' · offline mode'}. Your score comes from the real outcome and your detail grade from a fixed checklist, not from her opinion.
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {messages.slice(1).map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-lg leading-relaxed ${
              m.role === 'assistant' ? 'bg-slate-50 text-slate-800' : 'ml-auto bg-teal text-white'
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="w-fit rounded-xl bg-slate-50 px-4 py-3 text-lg text-slate-600">Sandra is thinking…</div>}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask a follow-up question, or push back if you disagree…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          onClick={ask}
          disabled={busy || !input.trim()}
          className="rounded-lg bg-accent px-6 text-lg font-bold text-white transition-colors hover:bg-accent-ink active:translate-y-px disabled:opacity-40"
        >
          Ask
        </button>
      </div>
    </div>
  )
}
