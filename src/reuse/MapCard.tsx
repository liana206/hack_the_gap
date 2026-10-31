// Floating card over the map: opens when a marker, route line or legend entry is clicked.

import { useState, type ReactNode } from 'react'
import type { Dataset, Exclusion, Farm, Hub, Lot, Params, Plan, Receiver, Route, Weights } from './types.ts'
import { isFlagged } from './match.ts'
import {
  COUNTRY_LABEL, ITEM_LABEL, LEGEND, ROUTE_COLORS, STAGE_LABEL, TIER_LABEL, TYPE_COLOR, TYPE_LABEL, UNIT_LABEL,
  fmtEur, fmtGJ, fmtT, type Card,
} from './ui.ts'
import { GradeBadge } from './FarmList.tsx'

export interface LotContext {
  lot: Lot
  routes: Route[]
  excluded: Exclusion[]
  plan: Plan
}

interface Props {
  card: Card
  data: Dataset
  year: number
  weights: Weights
  ctx: LotContext | null
  onClose: () => void
  onCard: (c: Card) => void
  onLot: (lotId: string) => void
}

export default function MapCard({ card, data, year, weights, ctx, onClose, onCard, onLot }: Props) {
  let body: ReactNode = null
  if (card.kind === 'legend') {
    const g = LEGEND.find((x) => x.key === card.key)!
    const items = [...data.farms, ...data.hubs, ...data.receivers].filter((e) =>
      g.types.includes('kind' in e ? e.kind : 'lots' in e ? 'farm' : 'hub'),
    )
    body = (
      <>
        <Head color={TYPE_COLOR[g.types[0]]} shape={g.shape} title={g.label} sub={`${items.length} on the map`} />
        <p className="text-xs text-slate-600">{g.text}</p>
        <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto">
          {items.map((e) => (
            <button key={e.id} onClick={() => onCard({ kind: 'entity', id: e.id })}
              className="block w-full truncate rounded px-1.5 py-1 text-left text-xs text-navy hover:bg-slate-100">
              {e.name} <span className="text-slate-400">· {COUNTRY_LABEL[e.country] ?? e.country}</span>
            </button>
          ))}
        </div>
      </>
    )
  } else {
    const farm = data.farms.find((f) => f.id === card.id)
    const hub = data.hubs.find((h) => h.id === card.id)
    const rec = data.receivers.find((r) => r.id === card.id)
    if (farm) body = <FarmCard f={farm} year={year} params={data.params} lotId={ctx?.lot.id ?? null} onLot={onLot} />
    else if (hub) body = <HubCard h={hub} ctx={ctx} />
    else if (rec) body = <ReceiverCard r={rec} ctx={ctx} params={data.params} weights={weights} />
  }

  return (
    <div className="absolute right-3 top-3 z-[600] max-h-[calc(100%-1.5rem)] w-[340px] overflow-y-auto rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
      <button onClick={onClose} className="float-right -mr-1 -mt-1 px-1 text-lg leading-none text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
      {body}
    </div>
  )
}

function Head({ color, shape, title, sub, pseudo }: { color: string; shape: 'circle' | 'square' | 'diamond'; title: string; sub: string; pseudo?: boolean }) {
  return (
    <div className="mb-2 flex items-start gap-2 pr-4">
      <span className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0"
        style={{ background: color, borderRadius: shape === 'circle' ? '50%' : 2, transform: shape === 'diamond' ? 'rotate(45deg)' : undefined }} />
      <div className="min-w-0">
        <div className="font-semibold leading-tight text-navy">{title}</div>
        <div className="text-xs text-slate-500">
          {sub}
          {pseudo && <span className="ml-1.5 rounded bg-slate-100 px-1 text-[10px] font-semibold uppercase text-slate-500">pseudo</span>}
        </div>
      </div>
    </div>
  )
}

function FarmCard({ f, year, params, lotId, onLot }: { f: Farm; year: number; params: Params; lotId: string | null; onLot: (id: string) => void }) {
  const flagged = isFlagged(f, year, params.planning_window_years)
  return (
    <>
      <Head color={TYPE_COLOR.farm} shape="circle" title={f.name} sub={`${f.place} · ${COUNTRY_LABEL[f.country]}`} />
      <Facts rows={[
        ['Turbines', `${f.turbines} × ${f.model}`],
        ['Capacity', `${f.mw} MW`],
        ['In service', `${f.commissioned}`],
        ['End of life (est.)', `~${f.end_of_life}`],
        ['Alpiq share', `${Math.round(f.alpiq_share * 100)}%`],
        ['Status', flagged ? `flagged in ${year}` : `flag from ${f.end_of_life - params.planning_window_years}`],
      ]} />
      {f.assumed && <div className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">Assumed: {f.assumed}</div>}
      <div className="card-title mb-1 mt-3">Components</div>
      <div className="space-y-1">
        {f.lots.map((l) => (
          <button key={l.id} onClick={() => onLot(l.id)}
            className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left text-xs ${l.id === lotId ? 'border-accent bg-accent-soft' : 'border-slate-200 hover:border-accent'}`}>
            <span><b className="text-navy">{ITEM_LABEL[l.item]}</b> · {l.quantity} {UNIT_LABEL[l.item]}</span>
            <GradeBadge g={l.grade} />
          </button>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-slate-400">
        Site and specs: <a href={f.source} target="_blank" rel="noreferrer" className="underline">Alpiq (public)</a>; component data is pseudo.
      </div>
    </>
  )
}

function HubCard({ h, ctx }: { h: Hub; ctx: LotContext | null }) {
  const here = ctx?.plan.allocation.lines.filter((l) => l.route.hub.id === h.id).reduce((s, l) => s + l.units, 0) ?? 0
  return (
    <>
      <Head color={TYPE_COLOR.hub} shape="square" title={h.name} sub={`Storage hub · ${COUNTRY_LABEL[h.country] ?? h.country}`} pseudo />
      <p className="text-xs text-slate-600">Items wait here after dismantling until a receiver is confirmed.</p>
      <Facts rows={[
        ...(Object.keys(h.capacity) as (keyof Hub['capacity'])[]).map((i): [string, string] => [ITEM_LABEL[i], `${h.capacity[i]} ${UNIT_LABEL[i]}`]),
        ['Licensed for waste', h.licensed_for_waste ? 'yes' : 'no'],
      ]} />
      {ctx && here > 0 && (
        <div className={`mt-2 rounded-lg px-2 py-1.5 text-xs ${here > h.capacity[ctx.lot.item] ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>
          This plan stores {here} {UNIT_LABEL[ctx.lot.item]} here (capacity {h.capacity[ctx.lot.item]}).
          {here > h.capacity[ctx.lot.item] && ' Stagger dismantling or split across hubs.'}
        </div>
      )}
    </>
  )
}

function ReceiverCard({ r, ctx, params, weights }: { r: Receiver; ctx: LotContext | null; params: Params; weights: Weights }) {
  const [calc, setCalc] = useState(false)
  const route = ctx?.routes.find((x) => x.receiver.id === r.id)
  const excl = ctx?.excluded.find((x) => x.receiver.id === r.id)
  const lineIdx = ctx?.plan.allocation.lines.findIndex((l) => l.route.receiver.id === r.id) ?? -1
  const units = lineIdx >= 0 ? ctx!.plan.allocation.lines[lineIdx].units : 0

  return (
    <>
      <Head color={TYPE_COLOR[r.kind]} shape="diamond" title={r.name}
        sub={`${TYPE_LABEL[r.kind]} · ${COUNTRY_LABEL[r.country] ?? r.country} · tier ${r.tier} ${TIER_LABEL[r.tier]}`} pseudo />
      <p className="text-xs text-slate-600">{r.description}</p>

      {ctx && (
        <div className="mt-2">
          {r.item !== ctx.lot.item ? (
            <Status tone="slate">Takes {ITEM_LABEL[r.item].toLowerCase()}, not {ITEM_LABEL[ctx.lot.item].toLowerCase()}.</Status>
          ) : excl ? (
            <Status tone="rose">Excluded: {excl.reason}</Status>
          ) : route && units > 0 ? (
            <Status tone="emerald" color={ROUTE_COLORS[lineIdx % ROUTE_COLORS.length]}>
              In this plan: <b>{units} {UNIT_LABEL[ctx.lot.item]}</b> · score {route.score.toFixed(2)}
            </Status>
          ) : route ? (
            <Status tone="slate">Valid route (score {route.score.toFixed(2)}), not used in this plan.</Status>
          ) : null}
        </div>
      )}

      {route && (
        <>
          <Facts rows={[
            ['Route', `${route.leg1.km} + ${route.leg2.km} km via ${route.hub.name}`],
            ['Transport / unit', `${route.oversize ? 'oversize' : 'standard'} · ${fmtT(route.co2_per_unit_t)} CO₂ · ${fmtEur(route.cost_per_unit_eur)}`],
            ['Embodied energy kept / unit', fmtGJ(route.embodied_kept_per_unit_gj)],
            ['Avoided CO₂ / unit', fmtT(route.avoided_per_unit_t)],
          ]} />
          {route.badges.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {route.badges.map((b) => (
                <span key={b.text} className={`rounded px-1.5 py-0.5 text-[10px] ${b.source === 'law' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                  {b.source === 'law' ? '§ ' : ''}{b.text}
                </span>
              ))}
            </div>
          )}
          <button onClick={() => setCalc(!calc)} className="mt-2 text-xs text-accent hover:underline">
            {calc ? '▾ Hide score' : '▸ Why this score'}
          </button>
          {calc && <ScoreBreakdown route={route} weights={weights} params={params} />}
        </>
      )}

      {!ctx && (
        <Facts rows={[
          ['Takes', ITEM_LABEL[r.item]],
          ['Stage', STAGE_LABEL[r.stage]],
          ['Quantity', `${r.quantity_min}–${r.quantity_max > 999 ? 'any' : r.quantity_max} ${UNIT_LABEL[r.item]}`],
          ['Needed by', r.needed_by ? String(r.needed_by) : 'any time'],
          ...(r.length_min || r.length_max ? [['Length', `${r.length_min ?? 0}–${r.length_max ?? '∞'} m`] as [string, string]] : []),
          ['Minimum grade', r.min_grade],
          ...(r.deadline ? [['Call closes', String(r.deadline)] as [string, string]] : []),
          ...(r.approval_months ? [['Structural approval', `${r.approval_months} months`] as [string, string]] : []),
        ]} />
      )}

      {r.precedent && (
        <div className="mt-2 text-[11px] text-emerald-800">
          Modelled on: <a href={r.precedent.url} target="_blank" rel="noreferrer" className="underline">{r.precedent.label}</a>
        </div>
      )}
      {!ctx && <div className="mt-2 text-[11px] text-slate-400">Pick a component on the left to see if this receiver fits.</div>}
    </>
  )
}

function ScoreBreakdown({ route, weights, params }: { route: Route; weights: Weights; params: Params }) {
  const wSum = Object.values(weights).reduce((s, x) => s + x, 0) || 1
  const terms: [string, number, number][] = [
    ['Timing', route.fits.timing, weights.timing],
    ['Condition', route.fits.condition, weights.condition],
    ['Low CO₂', route.fits.co2, weights.co2],
    ['Low cost', route.fits.cost, weights.cost],
    ['Certainty', route.fits.certainty, weights.certainty],
  ]
  return (
    <div className="mt-1 space-y-1 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
      {terms.map(([k, f, w]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-16 shrink-0">{k}</span>
          <div className="h-1.5 flex-1 rounded-full bg-slate-200">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${f * 100}%` }} />
          </div>
          <span className="w-20 text-right tabular-nums">{f.toFixed(2)} × {w} → {((f * w) / wSum).toFixed(2)}</span>
        </div>
      ))}
      <div className="pt-1 text-slate-400">
        Score ranks routes within tier {route.receiver.tier}; a higher tier always comes first. Truck factors {params.ef_kg_per_km.standard}/{params.ef_kg_per_km.oversize} kg CO₂/km are placeholders.
      </div>
    </div>
  )
}

function Status({ tone, color, children }: { tone: 'emerald' | 'rose' | 'slate'; color?: string; children: ReactNode }) {
  const cls = { emerald: 'bg-emerald-50 text-emerald-800', rose: 'bg-rose-50 text-rose-700', slate: 'bg-slate-50 text-slate-600' }[tone]
  return (
    <div className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs ${cls}`}>
      {color && <span className="mt-1 h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />}
      <span>{children}</span>
    </div>
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-400">{k}</dt>
          <dd className="text-right text-slate-700">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
