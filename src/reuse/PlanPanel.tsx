import { useState, type ReactNode } from 'react'
import type { Check, Dataset, Farm, Lot, Plan, PlanId, Weights } from './types.ts'
import { isFlagged } from './match.ts'
import { ITEM_LABEL, ROUTE_COLORS, UNIT_LABEL, fmtEur, fmtGJ, fmtT } from './ui.ts'
import { GradeBadge } from './FarmList.tsx'

export interface SignOff {
  coOwner: boolean
  proposed: string | null // plan fingerprint the junior proposed
  signed: string | null // plan fingerprint the senior signed
  signedAt: string | null
}
export const NO_SIGNOFF: SignOff = { coOwner: false, proposed: null, signed: null, signedAt: null }

export interface LotView {
  farm: Farm
  lot: Lot
  plans: Plan[]
  checks: Record<PlanId, Check[]>
  why: string[]
  excludedCount: number
  fingerprint: string
  signoff: SignOff
}

interface Props {
  data: Dataset
  year: number
  signedCount: number
  view: LotView | null
  planId: PlanId
  seg: boolean
  weights: Weights
  onPlan: (p: PlanId) => void
  onSeg: (s: boolean) => void
  onWeights: (w: Weights) => void
  onReceiver: (id: string) => void
  onSignoff: (s: SignOff) => void
}

export default function PlanPanel(p: Props) {
  if (!p.view) return <Overview data={p.data} year={p.year} signedCount={p.signedCount} />
  const { farm, lot, plans, checks } = p.view
  const plan = plans.find((x) => x.id === p.planId)!
  const t = plan.totals
  const failing = checks[plan.id].filter((c) => !c.ok)

  return (
    <div className="space-y-3 p-4">
      <div>
        <div className="text-xs text-slate-500">{farm.name}</div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-semibold text-navy">{ITEM_LABEL[lot.item]}</div>
          <GradeBadge g={lot.grade} />
        </div>
        <div className="text-xs text-slate-500">
          {lot.quantity} {UNIT_LABEL[lot.item]} · {lot.unit_mass_t} t each · free from ~{farm.end_of_life}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric k="Embodied energy kept" v={fmtGJ(t.embodied_kept_gj)} sub={`${Math.round((t.embodied_kept_gj / t.embodied_total_gj) * 100)}% of ${fmtGJ(t.embodied_total_gj)}`} strong />
        <Metric k="Transport cost" v={fmtEur(t.cost_eur)} sub={`${fmtGJ(t.transport_gj)} fuel energy`} />
        <Metric k="Net CO₂ benefit" v={fmtT(t.net_t)} sub={`${fmtT(t.avoided_t)} avoided − ${fmtT(t.co2_t)} transport`} />
        <Metric k="Delivery certainty" v={`${Math.round(t.certainty * 100)}%`} sub={`${t.reuse_units} units reused or repurposed`} />
      </div>

      <div>
        <div className="card-title mb-1.5">Top 3 plans</div>
        <div className="space-y-1.5">
          {plans.map((pl, i) => {
            const active = pl.id === plan.id
            const blocked = checks[pl.id].some((c) => c.blocking && !c.ok && c.id !== 'co-owner')
            return (
              <button key={pl.id} onClick={() => p.onPlan(pl.id)}
                className={`block w-full rounded-xl border p-2.5 text-left transition ${active ? 'border-accent bg-accent-soft/60 ring-1 ring-accent' : 'border-slate-200 hover:border-accent'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-navy">{i + 1}. {pl.name}</span>
                  {blocked && <span className="rounded bg-rose-50 px-1.5 text-[10px] text-rose-700">fails a check</span>}
                </div>
                <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-100">
                  {pl.allocation.lines.map((l, j) => (
                    <div key={l.route.receiver.id} style={{ width: `${(l.units / lot.quantity) * 100}%`, background: ROUTE_COLORS[j % ROUTE_COLORS.length] }} />
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-3 text-[11px] tabular-nums text-slate-600">
                  <span>{fmtGJ(pl.totals.embodied_kept_gj)} kept</span>
                  <span className="text-center">{fmtEur(pl.totals.cost_eur)}</span>
                  <span className="text-right">{fmtT(pl.totals.net_t)} CO₂</span>
                </div>
                {active && <div className="mt-1 text-[11px] text-slate-500">{pl.rule}</div>}
              </button>
            )
          })}
        </div>
      </div>

      {plan.id === 'recommended' && (
        <div className="rounded-xl bg-emerald-50/70 p-3">
          <div className="card-title mb-1 text-emerald-800">Why this plan</div>
          <ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">
            {p.view.why.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      <Fold title={`Where the ${UNIT_LABEL[lot.item]} go`} hint={`${plan.allocation.lines.length} receivers`}>
        <ul className="space-y-1">
          {plan.allocation.lines.map((l, j) => (
            <li key={l.route.receiver.id}>
              <button onClick={() => p.onReceiver(l.route.receiver.id)} className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-slate-100">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: ROUTE_COLORS[j % ROUTE_COLORS.length] }} />
                <span className="w-7 text-right font-semibold tabular-nums text-navy">{l.units}</span>
                <span className="truncate text-slate-600">{l.route.receiver.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {plan.allocation.fallback && (
          <div className="mt-1 text-[11px] text-slate-500">
            Fallback: if announced or open projects fall through, their {plan.allocation.uncertain_units} units go to {plan.allocation.fallback.receiver.name}.
          </div>
        )}
        {p.view.excludedCount > 0 && <div className="mt-1 text-[11px] text-slate-400">{p.view.excludedCount} receivers excluded: click a faded marker to see why.</div>}
      </Fold>

      <Fold title="Plan checks" hint={failing.length ? `${failing.length} open` : 'all passed'} warn={failing.some((c) => c.blocking)} defaultOpen={failing.length > 0}>
        <ul className="space-y-1">
          {checks[plan.id].map((c) => (
            <li key={c.id} className="flex gap-1.5 text-xs">
              <span className={c.ok ? 'text-emerald-600' : c.blocking ? 'text-rose-600' : 'text-amber-600'}>{c.ok ? '✔' : c.blocking ? '✖' : '!'}</span>
              <div>
                <span className="text-slate-700">{c.label}</span>{' '}
                <span className="text-[10px] uppercase text-slate-400">{c.source}</span>
                <div className="text-slate-500">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </Fold>

      <Fold title="Adjust ranking" hint={p.seg ? 'segmented' : undefined}>
        {lot.item === 'blade' && (
          <div className="mb-3">
            <div className="mb-1 text-xs text-slate-500">Blade transport</div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              {[false, true].map((s) => (
                <button key={String(s)} onClick={() => p.onSeg(s)}
                  className={`rounded-md py-1 ${p.seg === s ? 'bg-white font-medium text-navy shadow' : 'text-slate-500'}`}>
                  {s ? 'Segmented' : 'Whole'}
                </button>
              ))}
            </div>
          </div>
        )}
        {(Object.keys(p.weights) as (keyof Weights)[]).map((k) => (
          <label key={k} className="block text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{{ timing: 'Timing fit', condition: 'Condition fit', co2: 'Low transport CO₂', cost: 'Low transport cost', certainty: 'Demand certainty' }[k]}</span>
              <span className="tabular-nums text-slate-400">{p.weights[k]}</span>
            </div>
            <input type="range" min={0} max={3} step={0.5} value={p.weights[k]}
              onChange={(e) => p.onWeights({ ...p.weights, [k]: Number(e.target.value) })} className="w-full accent-[#2a78d6]" />
          </label>
        ))}
        <div className="text-[11px] text-slate-400">Weights rank routes within a tier; a higher waste-hierarchy tier always comes first.</div>
      </Fold>

      <SignOffBox view={p.view} planName={plan.name} onSignoff={p.onSignoff} />
      <div className="text-[11px] text-slate-400">All figures come from placeholder factors (pseudo data).</div>
    </div>
  )
}

function SignOffBox({ view, planName, onSignoff }: { view: LotView; planName: string; onSignoff: (s: SignOff) => void }) {
  const { farm, fingerprint, signoff: s } = view
  const plan = view.plans.find((x) => fingerprint.startsWith(x.id))!
  const blockers = view.checks[plan.id].filter((c) => c.blocking && !c.ok && c.id !== 'co-owner')
  const needsCoOwner = farm.alpiq_share < 1
  const proposed = s.proposed === fingerprint
  const signed = s.signed === fingerprint
  const canSign = proposed && blockers.length === 0 && (!needsCoOwner || s.coOwner)

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="card-title mb-1">Decision</div>
      <div className="mb-2 text-[11px] text-slate-500">
        The matcher ranks · the junior proposes · the senior signs{needsCoOwner && ' after the co-owner approves'}.
      </div>
      {blockers.length > 0 && <div className="mb-2 rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">Cannot sign: {blockers.map((b) => b.label).join(', ')}</div>}
      {s.signed && !signed && <div className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">A different plan was signed earlier. Propose and sign again to replace it.</div>}
      {needsCoOwner && (
        <label className="mb-2 flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={s.coOwner} onChange={(e) => onSignoff({ ...s, coOwner: e.target.checked })} />
          Co-owner approved ({Math.round((1 - farm.alpiq_share) * 100)}% share)
        </label>
      )}
      {signed ? (
        <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-700">
          ✔ {planName} signed · {new Date(s.signedAt!).toLocaleDateString()}
          <button onClick={() => onSignoff({ ...s, signed: null, signedAt: null })} className="ml-2 font-normal underline">withdraw</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onSignoff({ ...s, proposed: fingerprint })} disabled={proposed}
            className="rounded-lg border border-navy py-1.5 text-xs font-medium text-navy disabled:border-emerald-600 disabled:text-emerald-700">
            {proposed ? '✔ Proposed' : 'Propose (junior)'}
          </button>
          <button onClick={() => onSignoff({ ...s, signed: fingerprint, signedAt: new Date().toISOString() })} disabled={!canSign}
            className="rounded-lg bg-navy py-1.5 text-xs font-medium text-white disabled:opacity-40">
            Sign off (senior)
          </button>
        </div>
      )}
    </div>
  )
}

function Overview({ data, year, signedCount }: { data: Dataset; year: number; signedCount: number }) {
  const w = data.params.planning_window_years
  const flagged = data.farms.filter((f) => isFlagged(f, year, w))
  const blades = flagged.flatMap((f) => f.lots.filter((l) => l.item === 'blade'))
  const ee = flagged.flatMap((f) => f.lots).reduce((s, l) => s + l.quantity * l.unit_mass_t * data.params.embodied_mj_per_kg[l.item], 0)
  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="card-title">Fleet in {year}</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Metric k="Farms flagged" v={`${flagged.length} / ${data.farms.length}`} sub="inside the planning window" />
          <Metric k="Blades to place" v={String(blades.reduce((s, l) => s + l.quantity, 0))} sub={`${Math.round(blades.reduce((s, l) => s + l.quantity * l.unit_mass_t, 0))} t of composite`} />
          <Metric k="Embodied energy at stake" v={fmtGJ(ee)} sub="all components of flagged farms" strong />
          <Metric k="Plans signed" v={String(signedCount)} sub="by a senior" />
        </div>
      </div>
      <ol className="space-y-2 text-sm text-slate-600">
        <Step n={1}>Pick a wind farm on the left and open one of its components.</Step>
        <Step n={2}>The map draws its routes; the top 3 plans appear here with energy, cost and CO₂.</Step>
        <Step n={3}>Click any marker, route or legend entry for details.</Step>
        <Step n={4}>Propose the plan; a senior signs it.</Step>
      </ol>
      <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
        Pseudo data: farm sites and specs are public Alpiq data; components, hubs, receivers, prices and energy/CO₂ factors are invented placeholders.
      </div>
    </div>
  )
}

const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <li className="flex gap-2">
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white">{n}</span>
    <span>{children}</span>
  </li>
)

function Metric({ k, v, sub, strong }: { k: string; v: string; sub?: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${strong ? 'bg-emerald-50' : 'bg-slate-50'}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className={`text-lg font-semibold tabular-nums ${strong ? 'text-emerald-700' : 'text-navy'}`}>{v}</div>
      {sub && <div className="text-[10px] leading-tight text-slate-500">{sub}</div>}
    </div>
  )
}

function Fold({ title, hint, warn, defaultOpen, children }: { title: string; hint?: string; warn?: boolean; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="rounded-xl border border-slate-200">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-left">
        <span className="text-sm font-medium text-slate-700">{open ? '▾' : '▸'} {title}</span>
        {hint && <span className={`text-[11px] ${warn ? 'text-rose-600' : 'text-slate-400'}`}>{hint}</span>}
      </button>
      {open && <div className="border-t border-slate-100 px-3 py-2">{children}</div>}
    </div>
  )
}
