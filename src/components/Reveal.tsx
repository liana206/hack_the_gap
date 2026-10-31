import { ANSWERS, type Answer, type Debate, type Scenario } from '../types'
import { gradeReasoning } from '../senior'
import { eur } from './CaseFacts'

interface Props {
  s: Scenario
  decision: Answer
  reason: string
  firstDecision?: Answer
  debate?: Debate
}

export default function Reveal({ s, decision, reason, firstDecision, debate }: Props) {
  const correct = decision === s.truth.answer
  const best = s.truth.answer
  const title = (a: Answer) => ANSWERS.find((x) => x.id === a)!.title
  const detail = gradeReasoning(reason)
  const stance = firstDecision && s.challenge?.stance
  const trap = stance && stance !== best

  return (
    <div className="card overflow-hidden">
      <div className={`px-6 py-4 ${correct ? 'bg-emerald-50' : 'bg-rose-50'}`}>
        <div className={`text-lg font-semibold ${correct ? 'text-emerald-700' : 'text-rose-700'}`}>
          {correct ? '✓ Right call' : '✗ Not the right call'}
        </div>
        <div className="text-sm text-slate-600">
          You chose <b>{title(decision)}</b>. The right answer was <b>{title(best)}</b>.
        </div>
      </div>

      {stance && (
        <div className={`border-b px-6 py-4 text-sm ${trap ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="font-semibold text-slate-800">
            {trap
              ? `This was a trap: Sandra argued "${title(stance)}" on purpose, and she was wrong.`
              : `No trap this time: Sandra argued "${title(stance)}", and she was right.`}
          </div>
          <div className="mt-0.5 text-slate-600">
            {firstDecision === decision ? `You stayed with your first call, ${title(firstDecision)}.` : `You changed from ${title(firstDecision)} to ${title(decision)}.`}{' '}
            {correct ? (trap ? 'You caught the wrong AI.' : 'You judged her advice correctly.') : trap ? 'The wrong AI got through.' : 'You rejected good advice.'}
          </div>
          <p className="mt-2 italic text-slate-500">Sandra: “{s.challenge!.text}”</p>
          {debate && (debate.rounds > 0 || debate.satisfied) && (
            <div className="mt-2 text-slate-600">
              <p>
                Debate: {debate.rounds} {debate.rounds === 1 ? 'reply' : 'replies'}
                {debate.satisfied && ', then you ended it yourself'}.{' '}
                {!debate.checked
                  ? 'Gemini was unavailable, so your replies were not checked.'
                  : !debate.open.length && 'No argument of hers was left open.'}{' '}
                This is feedback and does not change your score.
              </p>
              {debate.checked && debate.open.length > 0 && (
                <p className="mt-1.5">
                  <span className="font-medium text-slate-700">Her arguments you never answered:</span> {debate.open.join('; ')}.
                </p>
              )}
              {debate.missing.length > 0 && (
                <p className="mt-1.5">
                  <span className="font-medium text-slate-700">Evidence you never brought up:</span> {debate.missing.join(', ')}.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {best === 'dismantle' && (
        // Hand-off to week 4: the dismantled turbine's parts get matched to second-life uses.
        <a href={`#/map?case=${s.id}`}
          className="flex items-center justify-between gap-4 border-b border-slate-100 bg-sky-50 px-6 py-3 text-sm text-sky-900 hover:bg-sky-100">
          <span>
            <b>Next: second life.</b> {s.turbine.name} is being dismantled. Plan where its blades, tower and generator go.
          </span>
          <span className="shrink-0 font-medium">Open in Stage 4 →</span>
        </a>
      )}

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="card-title mb-1">What happened</div>
            <p className="leading-relaxed text-slate-700">{s.truth.outcome}</p>
          </div>
          <div>
            <div className="card-title mb-1">Why</div>
            <p className="leading-relaxed text-slate-700">{s.truth.explanation}</p>
          </div>
          {reason && (
            <div>
              <div className="card-title mb-1">Your reasoning</div>
              <p className="rounded-xl bg-slate-50 p-3 text-sm italic text-slate-600">“{reason}”</p>
              <div className="card-title mb-1 mt-4">
                Detail grade: <span className="text-navy">{detail.grade}</span> ({detail.points}/{detail.max})
              </div>
              <ul className="grid gap-x-4 text-sm sm:grid-cols-2">
                {detail.checks.map((c) => (
                  <li key={c.label} className={c.hit ? 'text-emerald-700' : 'text-slate-400'}>
                    {c.hit ? '✓' : '✗'} {c.label}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-400">Shows how much evidence you covered, not whether it is right.</p>
            </div>
          )}
        </div>

        <div>
          <div className="card-title mb-2">Illustrative cost if you had chosen…</div>
          <table className="w-full text-sm">
            <tbody>
              {ANSWERS.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-2 text-slate-700">
                    {a.title}
                    {a.id === decision && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">you</span>}
                    {a.id === best && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">best</span>}
                  </td>
                  <td className={`py-2.5 text-right font-mono tabular-nums ${a.id === best ? 'font-semibold text-emerald-700' : 'text-slate-700'}`}>
                    {eur(s.truth.cost_if[a.id])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">
            Illustrative numbers incl. repairs, downtime and lost production. Not real Alpiq figures.
          </p>
        </div>
      </div>
    </div>
  )
}
