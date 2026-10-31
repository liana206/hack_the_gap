import { ANSWERS, type Answer, type Scenario } from '../types'
import { eur } from './CaseFacts'

export default function Reveal({ s, decision, reason }: { s: Scenario; decision: Answer; reason: string }) {
  const correct = decision === s.truth.answer
  const best = s.truth.answer
  const title = (a: Answer) => ANSWERS.find((x) => x.id === a)!.title

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
          <div>
            <div className="card-title mb-1">Your reasoning</div>
            <p className="rounded-xl bg-slate-50 p-3 text-sm italic text-slate-600">“{reason}”</p>
          </div>
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
