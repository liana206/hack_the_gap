import { useState } from 'react'
import type { Dataset, Grade } from './types.ts'
import { isFlagged } from './match.ts'
import { COUNTRY_LABEL, ITEM_LABEL, UNIT_LABEL } from './ui.ts'

export const YEAR_MIN = 2026
export const YEAR_MAX = 2040

interface Props {
  data: Dataset
  year: number
  lotId: string | null
  signed: Set<string>
  onYear: (y: number) => void
  onFarm: (farmId: string) => void
  onLot: (lotId: string | null) => void
}

export default function FarmList({ data, year, lotId, signed, onYear, onFarm, onLot }: Props) {
  const win = data.params.planning_window_years
  const selectedFarm = data.farms.find((f) => f.lots.some((l) => l.id === lotId))?.id
  const [open, setOpen] = useState<string | null>(selectedFarm ?? null)
  const farms = [...data.farms].sort(
    (a, b) => Number(isFlagged(b, year, win)) - Number(isFlagged(a, year, win)) || a.end_of_life - b.end_of_life,
  )
  const flaggedCount = farms.filter((f) => isFlagged(f, year, win)).length

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-baseline justify-between">
          <span className="card-title">Planning year</span>
          <span className="text-lg font-semibold text-navy">{year}</span>
        </div>
        <input type="range" min={YEAR_MIN} max={YEAR_MAX} value={year} onChange={(e) => onYear(Number(e.target.value))}
          className="mt-1 w-full accent-[#2a78d6]" />
        <div className="text-[11px] text-slate-500">
          <b className="text-orange-600">{flaggedCount}</b> of {farms.length} farms flagged ({win} years before estimated end of life)
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {farms.map((f) => {
          const flagged = isFlagged(f, year, win)
          const isOpen = open === f.id
          return (
            <div key={f.id} className={`mb-1 rounded-xl ${isOpen ? 'bg-slate-50 ring-1 ring-slate-200' : ''}`}>
              <button
                onClick={() => {
                  setOpen(isOpen ? null : f.id)
                  onFarm(f.id)
                }}
                className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
              >
                <span className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#2a78d6]"
                  style={flagged ? { boxShadow: '0 0 0 2px #fff, 0 0 0 4px #f97316' } : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-navy">{f.name}</span>
                    <span className="text-xs text-slate-400">{isOpen ? '▾' : '▸'}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {COUNTRY_LABEL[f.country]} · {f.turbines} × {f.model}
                  </div>
                  <div className="text-xs">
                    {flagged ? (
                      <span className="text-orange-600">flagged · end of life ~{f.end_of_life}</span>
                    ) : (
                      <span className="text-slate-400">flag from {f.end_of_life - win}</span>
                    )}
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="space-y-1 px-2 pb-2">
                  {f.lots.map((l) => {
                    const active = l.id === lotId
                    return (
                      <button key={l.id} onClick={() => onLot(active ? null : l.id)}
                        className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${
                          active ? 'border-accent bg-white ring-2 ring-accent/30' : 'border-slate-200 bg-white hover:border-accent'
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-navy">{ITEM_LABEL[l.item]}</span>
                          <span className="flex items-center gap-1">
                            {signed.has(l.id) && <span className="text-xs text-emerald-600">✔ signed</span>}
                            <GradeBadge g={l.grade} />
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {l.quantity} {UNIT_LABEL[l.item]} · {l.unit_mass_t} t each{l.length_m && ` · ${l.length_m} m`}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                          <div className="h-1 flex-1 rounded-full bg-slate-100">
                            <div className="h-1 rounded-full bg-accent" style={{ width: `${l.passport_pct}%` }} />
                          </div>
                          passport {l.passport_pct}%
                        </div>
                        {active && <div className="mt-1 text-[11px] text-accent">Routes shown on the map →</div>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function GradeBadge({ g }: { g: Grade }) {
  const cls = { A: 'bg-emerald-100 text-emerald-700', B: 'bg-amber-100 text-amber-700', C: 'bg-rose-100 text-rose-700' }[g]
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>Grade {g}</span>
}
