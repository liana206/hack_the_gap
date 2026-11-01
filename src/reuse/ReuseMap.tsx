import { useEffect, useRef, useState, type ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Allocation, Route } from './types.ts'
import { LEGEND, ROUTE_COLORS, TYPE_COLOR, TYPE_LABEL, type Entity } from './ui.ts'

interface Props {
  ents: Entity[]
  involved: Set<string> | null // with a lot selected: places on its routes; others fade
  selected: string | null
  routes: Route[] | null
  allocation: Allocation | null
  fitKey: string // refit the view when this changes
  onMarker: (id: string) => void
  onLegend: (key: string) => void
  children?: ReactNode // floating card
}

function icon(e: Entity, faded: boolean, selected: boolean) {
  const c = TYPE_COLOR[e.type]
  const size = selected ? 20 : e.type === 'farm' ? 15 : 13
  const shape =
    e.type === 'farm' ? 'border-radius:50%' : e.type === 'hub' ? 'border-radius:2px' : 'transform:rotate(45deg);border-radius:2px'
  const ring = e.flagged ? 'box-shadow:0 0 0 3px #fff,0 0 0 6px #f97316;' : 'box-shadow:0 0 0 2px #fff,0 1px 4px rgba(0,0,0,.35);'
  const border = selected ? 'outline:2px solid #0f3d2e;outline-offset:3px;' : ''
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;background:${c};${shape};${ring}${border}opacity:${faded ? 0.25 : 1};cursor:pointer"></div>`,
  })
}

export default function ReuseMap({ ents, involved, selected, routes, allocation, fitKey, onMarker, onLegend, children }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const [offline, setOffline] = useState(false)
  const lastFit = useRef('')

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true }).setView([45, 9], 4)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 12,
      className: 'reuse-tiles',
    })
      .on('tileerror', () => setOffline(true))
      .addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    lastFit.current = '' // a fresh map (also after a StrictMode remount) needs its view fitted again
    return () => void m.remove()
  }, [])

  useEffect(() => {
    const m = map.current!
    const g = layer.current!
    g.clearLayers()

    // Route lines: leg 1 dashed (farm → hub), leg 2 solid (hub → receiver), coloured by plan order.
    if (routes && allocation) {
      const order = allocation.lines.map((l) => l.route.receiver.id)
      const leg1 = routes[0]?.leg1
      if (leg1)
        L.polyline([leg1.from, leg1.to], { color: '#0f3d2e', weight: 3, dashArray: '6 6' })
          .bindTooltip(`${leg1.km} km`, { permanent: true, direction: 'center', className: 'km-label' })
          .addTo(g)
      for (const r of [...routes].sort((a, b) => order.indexOf(b.receiver.id) - order.indexOf(a.receiver.id))) {
        const i = order.indexOf(r.receiver.id)
        const line = L.polyline([r.leg2.from, r.leg2.to], {
          color: i >= 0 ? ROUTE_COLORS[i % ROUTE_COLORS.length] : '#8a9a94',
          weight: selected === r.receiver.id ? 7 : i >= 0 ? 4 : 2,
          opacity: 0.9,
          dashArray: i >= 0 ? undefined : '2 6',
        }).addTo(g)
        if (i >= 0) line.bindTooltip(`${r.leg2.km} km`, { permanent: true, direction: 'center', className: 'km-label' })
        line.on('click', () => onMarker(r.receiver.id))
      }
    }

    for (const e of ents) {
      const faded = involved !== null && !involved.has(e.id)
      const mk = L.marker([e.lat, e.lon], {
        icon: icon(e, faded, selected === e.id),
        zIndexOffset: e.type === 'farm' ? 500 : faded ? -500 : 0,
      })
      mk.bindTooltip(`<b>${e.name}</b><br>${TYPE_LABEL[e.type]}${e.flagged ? ' · flagged' : ''}`, { direction: 'top', offset: [0, -8] })
      mk.on('click', () => onMarker(e.id))
      mk.addTo(g)
    }

    if (fitKey !== lastFit.current) {
      lastFit.current = fitKey
      const pts = ents.filter((e) => involved === null || involved.has(e.id)).map((e) => [e.lat, e.lon] as [number, number])
      if (pts.length) {
        m.invalidateSize() // the grid may have resized the map since it was created
        m.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 7, animate: false })
      }
    }
  }, [ents, involved, selected, routes, allocation, fitKey, onMarker])

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-slate-200">
      <div ref={el} className="h-full w-full bg-slate-200" />
      <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-white/95 px-2 py-2 text-xs text-slate-600 shadow">
        {LEGEND.map((g) => (
          <button key={g.key} onClick={() => onLegend(g.key)}
            className="flex w-full items-center gap-2 rounded px-1.5 py-0.5 text-left hover:bg-slate-100" title="What is this?">
            <span className="inline-block h-2.5 w-2.5"
              style={{ background: TYPE_COLOR[g.types[0]], borderRadius: g.shape === 'circle' ? '50%' : 2, transform: g.shape === 'diamond' ? 'rotate(45deg)' : undefined }} />
            {g.label}
            <span className="text-slate-300">ⓘ</span>
          </button>
        ))}
        {routes && (
          <div className="mt-1 space-y-0.5 border-t border-slate-100 px-1.5 pt-1">
            <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-2 border-dashed border-navy" /> Leg 1: farm → hub</div>
            <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-[3px] border-emerald-600" /> Leg 2: in the plan</div>
            <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-2 border-dotted border-slate-400" /> Valid, not used</div>
          </div>
        )}
      </div>
      {offline && (
        <div className="absolute left-14 top-3 z-[500] rounded-lg bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow">
          Map tiles offline: markers and distances are still correct
        </div>
      )}
      {children}
    </div>
  )
}
