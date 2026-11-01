import { ANSWERS, type Answer, type Debate, type Scenario } from '../types'
import { gradeReasoning } from '../senior'
import { eur } from './CaseFacts'
import Mark from './Mark'

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
      <div className={`px-7 py-5 text-white ${correct ? 'bg-accent' : 'bg-rose-700'}`}>
        <div className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
          <Mark kind={correct ? 'check' : 'cross'} />
          {correct ? 'Right call' : 'Not the right call'}
        </div>
        <div className="mt-1 text-lg text-white">
          You chose <b>{title(decision)}</b>. The right answer was <b>{title(best)}</b>.
        </div>
      </div>

      {stance && (
        <div className={`border-b px-7 py-5 text-base ${trap ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="text-lg font-bold text-slate-800">
            {trap
              ? `This was a trap: Sandra argued "${title(stance)}" on purpose, and she was wrong.`
              : `No trap this time: Sandra argued "${title(stance)}", and she was right.`}
          </div>
          <div className="mt-0.5 text-slate-700">
            {firstDecision === decision ? `You stayed with your first call, ${title(firstDecision)}.` : `You changed from ${title(firstDecision)} to ${title(decision)}.`}{' '}
            {correct ? (trap ? 'You caught the wrong AI.' : 'You judged her advice correctly.') : trap ? 'The wrong AI got through.' : 'You rejected good advice.'}
          </div>
          <p className="mt-2 italic text-slate-600">Sandra: “{s.challenge!.text}”</p>
          {debate && (debate.rounds > 0 || debate.satisfied) && (
            <div className="mt-2 text-slate-700">
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
          className="flex items-center justify-between gap-4 border-b border-slate-100 bg-teal-soft px-7 py-4 text-lg text-navy hover:bg-[#cfe4e8]">
          <span>
            <b>Next: second life.</b> {s.turbine.name} is being dismantled. Plan where its blades, tower and generator go.
          </span>
          <span className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-base font-semibold text-white">Open the map →</span>
        </a>
      )}

      <div className="grid gap-8 p-7 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="card-title mb-1 text-base">What happened</div>
            <p className="text-lg leading-relaxed text-slate-800">{s.truth.outcome}</p>
          </div>
          <div>
            <div className="card-title mb-1 text-base">Why</div>
            <p className="text-lg leading-relaxed text-slate-800">{s.truth.explanation}</p>
          </div>
          {reason && (
            <div>
              <div className="card-title mb-1 text-base">Your reasoning</div>
              <p className="rounded-lg bg-slate-50 p-3 text-base italic text-slate-800">“{reason}”</p>
              <div className="card-title mb-1 mt-4 text-base">
                Detail grade: <span className="text-navy">{detail.grade}</span> ({detail.points}/{detail.max})
              </div>
              <ul className="grid gap-x-4 gap-y-1 text-base sm:grid-cols-2">
                {detail.checks.map((c) => (
                  <li key={c.label} className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${c.hit ? 'bg-accent-soft font-medium text-accent-ink' : 'text-slate-500'}`}>
                    <Mark kind={c.hit ? 'check' : 'cross'} /> {c.label}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-sm text-slate-600">Shows how much evidence you covered, not whether it is right.</p>
            </div>
          )}
        </div>

        <div>
          <div className="card-title mb-2 text-base">Illustrative cost if you had chosen…</div>
          <table className="w-full text-lg">
            <tbody>
              {ANSWERS.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-2 text-slate-700">
                    {a.title}
                    {a.id === decision && <span className="ml-2 rounded-full bg-teal-soft px-2.5 py-0.5 text-sm font-medium text-teal">you</span>}
                    {a.id === best && <span className="ml-2 rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-medium text-accent-ink">best</span>}
                  </td>
                  <td className={`py-2.5 text-right tabular-nums ${a.id === best ? 'font-bold text-accent-ink' : 'text-slate-800'}`}>
                    {eur(s.truth.cost_if[a.id])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-slate-600">
            Illustrative numbers incl. repairs, downtime and lost production. Not real Alpiq figures.
          </p>
        </div>
      </div>
    </div>
  )
}
