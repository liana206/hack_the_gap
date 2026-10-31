import { useEffect, useRef, useState } from 'react'
import { askSenior, buildSystemPrompt, offlineFeedback } from '../senior'
import type { Answer, ChatMessage, Scenario } from '../types'
import type { Week } from '../weeks'

const OPENER = 'I made my decision. Please give me your feedback.'

interface Props {
  week: Week
  s: Scenario
  decision: Answer
  reason: string
}

export default function SeniorChat({ week, s, decision, reason }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const started = useRef(false)
  // Week 1: Sandra only speaks after the reveal, so she may know the truth.
  const system = buildSystemPrompt(week, s, decision, reason, true)

  async function send(history: ChatMessage[]) {
    setBusy(true)
    try {
      const text = await askSenior(system, history)
      if (text === null) {
        setOffline(true)
        const reply =
          history.length === 1
            ? offlineFeedback(s, decision)
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
          ? offlineFeedback(s, decision, `Gemini unavailable: ${msg}`)
          : `⚠️ Could not reach the senior (${msg}). Try asking again in a moment.`
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
    <div className="card p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-navy text-sm font-semibold text-white">SK</div>
        <div>
          <div className="font-semibold text-navy">Sandra · Senior maintenance engineer</div>
          <div className="text-xs text-slate-500">
            AI coach ({week.seniorStyle} style){offline && ' · offline mode'}. She explains; she does not grade you. Your score comes from the real outcome.
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {messages.slice(1).map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'assistant' ? 'bg-slate-50 text-slate-800' : 'ml-auto bg-accent text-white'
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="w-fit rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">Sandra is thinking…</div>}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask a follow-up question, or push back if you disagree…"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          onClick={ask}
          disabled={busy || !input.trim()}
          className="rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-40"
        >
          Ask
        </button>
      </div>
    </div>
  )
}
