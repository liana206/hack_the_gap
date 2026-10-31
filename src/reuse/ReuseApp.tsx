import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Check, Ctx, Dataset, PlanId } from './types.ts'
import { rankLot } from './match.ts'
import { buildPlans, checkPlan, explainPlan } from './allocate.ts'
import { entities, parseHash, toHash, type ViewState } from './ui.ts'
import FarmList, { YEAR_MIN } from './FarmList.tsx'
import ReuseMap from './ReuseMap.tsx'
import MapCard from './MapCard.tsx'
import PlanPanel, { NO_SIGNOFF, type LotView, type SignOff } from './PlanPanel.tsx'

const SIGNOFF_KEY = 'reuse-signoff-v2'

function loadSignoffs(): Record<string, SignOff> {
  try {
    return JSON.parse(localStorage.getItem(SIGNOFF_KEY) ?? '{}')
  } catch {
    return {}
  }
}

// One screen, no page scroll: farms left, map centre, plans right. Details open in a card on the map.
export default function ReuseApp() {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewState>(() => parseHash(location.hash, YEAR_MIN))
  const [signoffs, setSignoffs] = useState<Record<string, SignOff>>(loadSignoffs)

  useEffect(() => {
    fetch('/reuse/dataset.json')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Could not load public/reuse/dataset.json'))
  }, [])

  // The view lives in the URL, so every demo step can be bookmarked.
  useEffect(() => {
    const h = toHash(view)
    if (location.hash !== h) history.replaceState(null, '', h)
  }, [view])
  useEffect(() => {
    const onHash = () => setView(parseHash(location.hash, YEAR_MIN))
    addEventListener('hashchange', onHash)
    return () => {
      removeEventListener('hashchange', onHash)
      history.replaceState(null, '', location.pathname) // leaving week 4
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(SIGNOFF_KEY, JSON.stringify(signoffs))
    } catch {
      /* private mode: sign-offs just don't persist */
    }
  }, [signoffs])

  const patch = useCallback((p: Partial<ViewState>) => setView((v) => ({ ...v, ...p })), [])
  const ents = useMemo(() => (data ? entities(data, view.year) : []), [data, view.year])

  // Everything for the selected lot derives from the view; nothing is cached.
  const sel = useMemo(() => {
    if (!data || !view.lotId) return null
    const farm = data.farms.find((f) => f.lots.some((l) => l.id === view.lotId))
    const lot = farm?.lots.find((l) => l.id === view.lotId)
    if (!farm || !lot) return null
    const ctx: Ctx = { data, year: view.year, segmented: view.seg, weights: view.w }
    const { routes, excluded } = rankLot(farm, lot, ctx)
    const plans = buildPlans(lot, routes, ctx)
    const signoff = signoffs[lot.id] ?? NO_SIGNOFF
    const checks = Object.fromEntries(plans.map((p) => [p.id, checkPlan(farm, lot, p.allocation, ctx, signoff.coOwner)])) as Record<PlanId, Check[]>
    const plan = plans.find((p) => p.id === view.plan)!
    const lotView: LotView = {
      farm, lot, plans, checks, signoff,
      why: explainPlan(plans[0], plans, excluded, lot),
      excludedCount: excluded.length,
      fingerprint: `${plan.id}|${view.seg ? 'seg' : 'whole'}|${plan.allocation.lines.map((l) => `${l.route.receiver.id}:${l.units}`).join(',')}`,
    }
    const involved = new Set<string>([farm.id, ...routes.map((r) => r.receiver.id), ...routes.map((r) => r.hub.id)])
    return { lotView, routes, excluded, plan, involved }
  }, [data, view, signoffs])

  const onMarker = useCallback((id: string) => patch({ card: { kind: 'entity', id } }), [patch])
  const onLegend = useCallback((key: string) => patch({ card: { kind: 'legend', key } }), [patch])

  const signed = useMemo(() => new Set(Object.entries(signoffs).filter(([, s]) => s.signed).map(([id]) => id)), [signoffs])

  if (error) return <div className="card m-6 border-l-4 border-rose-400 p-4 text-sm text-rose-700">{error}</div>
  if (!data) return <div className="card m-6 p-10 text-center text-slate-400">Loading map…</div>

  const cardId = view.card?.kind === 'entity' ? view.card.id : null

  return (
    <div className="mx-auto flex h-[calc(100vh-5.5rem)] max-w-[1800px] flex-col px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold text-navy">Reuse Matching Map</h2>
          <span className="text-sm text-slate-500">Match end-of-life turbine parts with second-life uses, years before dismantling.</span>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-800 ring-1 ring-amber-200">
          Pseudo data · farm specs public, everything else placeholder
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_380px] gap-3">
        <aside className="card min-h-0 overflow-hidden">
          <FarmList
            data={data}
            year={view.year}
            lotId={view.lotId}
            signed={signed}
            onYear={(year) => patch({ year })}
            onFarm={(id) => patch({ card: { kind: 'entity', id } })}
            onLot={(lotId) => patch({ lotId, plan: 'recommended', card: null })}
          />
        </aside>

        <ReuseMap
          ents={ents}
          involved={sel?.involved ?? null}
          selected={cardId ?? sel?.lotView.farm.id ?? null}
          routes={sel?.routes ?? null}
          allocation={sel?.plan.allocation ?? null}
          fitKey={view.lotId ?? 'all'}
          onMarker={onMarker}
          onLegend={onLegend}
        >
          {view.card && (
            <MapCard
              card={view.card}
              data={data}
              year={view.year}
              weights={view.w}
              ctx={sel ? { lot: sel.lotView.lot, routes: sel.routes, excluded: sel.excluded, plan: sel.plan } : null}
              onClose={() => patch({ card: null })}
              onCard={(card) => patch({ card })}
              onLot={(lotId) => patch({ lotId, plan: 'recommended' })}
            />
          )}
        </ReuseMap>

        <aside className="card min-h-0 overflow-y-auto">
          <PlanPanel
            data={data}
            year={view.year}
            signedCount={signed.size}
            view={sel?.lotView ?? null}
            planId={view.plan}
            seg={view.seg}
            weights={view.w}
            onPlan={(plan) => patch({ plan })}
            onSeg={(seg) => patch({ seg })}
            onWeights={(w) => patch({ w })}
            onReceiver={(id) => patch({ card: { kind: 'entity', id } })}
            onSignoff={(s) => sel && setSignoffs((all) => ({ ...all, [sel.lotView.lot.id]: s }))}
          />
        </aside>
      </div>
    </div>
  )
}
