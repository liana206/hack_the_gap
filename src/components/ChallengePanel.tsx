import { useState } from 'react'
import { askDebate, buildDebatePrompt, gradeReasoning } from '../senior'
import { ANSWERS, type Answer, type ChatMessage, type Debate, type Scenario } from '../types'

const MAX_ROUNDS = 8 // the debate must always end, even if an argument cannot be answered
const NO_OBJECTIONS = 'I have no more objections. You may lock in your call.'
const ASK_MORE = 'I am not convinced yet. What else in the data supports your call?'

interface Props {
  s: Scenario
  first: Answer
  reason: string
  onFinal: (d: Answer, debate: Debate) => void
}

export default function ChallengePanel({ s, first, reason, onFinal }: Props) {
  const { stance, text, points } = s.challenge!
  const opening = `${stance === first ? 'I agree with your call.' : 'I disagree with your call.'} ${text}`
  const [call, setCall] = useState(first)
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: opening }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [answered, setAnswered] = useState<number[]>([])
  const [covered, setCovered] = useState<string[]>([]) // evidence Gemini recognised in other wording
  const [unchecked, setUnchecked] = useState<string | null>(null) // why Gemini could not check the replies
  const [satisfied, setSatisfied] = useState(false) // the junior stands by their case: what is left open shows after the reveal

  const replies = messages.filter((m) => m.role === 'user').map((m) => m.content)
  // Tracked here but never shown: the junior has to find the arguments alone.
  const missingIn = (said: string[]) =>
    gradeReasoning([reason, ...said].join(' ')).checks.filter((c) => !c.hit && !covered.includes(c.label)).map((c) => c.label)
  const missing = missingIn(replies)
  const evidenceMissing = missing.length > 0
  const against = call !== stance
  const open = against ? points.map((text, i) => ({ i, text })).filter((p) => !answered.includes(p.i)) : []
  const capped = replies.length >= MAX_ROUNDS
  const convinced = open.length === 0 && !evidenceMissing
  const done = convinced || capped || unchecked !== null || satisfied

  async function send() {
    const said = input.trim()
    if (!said || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: said }]
    setMessages(next)
    setInput('')
    setBusy(true)
    const stillMissing = missingIn([...replies, said])
    try {
      const turn = await askDebate(buildDebatePrompt(s, call, stance, open, stillMissing), [{ role: 'user', content: reason }, ...next])
      if (turn === null) {
        setUnchecked('no Gemini key set')
      } else {
        const valid = turn.answered.filter((n) => open.some((p) => p.i === n)) // only arguments that were still open
        setAnswered((a) => [...a, ...valid])
        setCovered((c) => [...c, ...turn.covered])
        // The app decides when the debate is over, and what she may say once only hidden evidence is left.
        const leftArgs = open.filter((p) => !valid.includes(p.i))
        const leftEvidence = stillMissing.filter((m) => !turn.covered.includes(m))
        const hints = gradeReasoning(turn.reply).checks.some((c) => c.hit && leftEvidence.includes(c.label))
        const content = !leftArgs.length && !leftEvidence.length ? NO_OBJECTIONS : !leftArgs.length && hints ? ASK_MORE : turn.reply
        setMessages([...next, { role: 'assistant', content }])
      }
    } catch (e) {
      setUnchecked((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-navy text-sm font-semibold text-white">SK</div>
        <div>
          <div className="font-semibold text-navy">Debate with Sandra</div>
          <div className="text-xs text-slate-500">She is sometimes wrong on purpose. Check her arguments against the data: the decision is yours. The debate does not change your score.</div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'assistant' ? 'bg-slate-50 text-slate-800' : 'ml-auto bg-accent text-white'
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="w-fit rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">Sandra is checking your argument…</div>}
      </div>

      {!done && (
        <div className="mt-4 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Answer her, using the data…"
            className="flex-1 rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <div className="flex flex-col gap-2">
            <button onClick={send} disabled={busy || !input.trim()} className="flex-1 rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-40">
              Reply
            </button>
            <button
              onClick={() => setSatisfied(true)}
              disabled={busy}
              title="End the debate and stand by what you have said so far. What you left open is shown after the reveal."
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              I'm satisfied with my case
            </button>
          </div>
        </div>
      )}

      <h3 className="mt-5 text-sm font-semibold text-slate-700">Your call</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {ANSWERS.map((a) => {
          const on = call === a.id
          return (
            <button
              key={a.id}
              onClick={() => setCall(a.id)}
              aria-pressed={on}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                on ? 'border-accent bg-accent-soft shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`font-semibold ${on ? 'text-accent' : 'text-slate-800'}`}>{a.title}</div>
              {a.id === stance && <div className="mt-1 text-[11px] font-medium text-slate-500">Sandra's call</div>}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          {unchecked
            ? `Offline: your replies cannot be checked (${unchecked}). You can lock in.`
            : !done
              ? `Sandra is not convinced yet: keep making your case (reply ${replies.length} of ${MAX_ROUNDS}), or end the debate if you are satisfied.`
              : convinced
                ? 'Sandra has no more objections. Lock in when you are ready.'
                : satisfied
                  ? 'You ended the debate and stand by your case. What you left open is shown after the reveal.'
                  : 'Debate over: you used all your replies, and Sandra is still not convinced.'}
        </span>
        <button
          disabled={!done || busy}
          onClick={() =>
            onFinal(call, {
              said: replies.join(' / '),
              rounds: replies.length,
              open: open.map((p) => p.text),
              missing,
              satisfied: satisfied && !convinced,
              checked: unchecked === null,
            })
          }
          className="shrink-0 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Lock in final call & reveal
        </button>
      </div>
    </div>
  )
}
