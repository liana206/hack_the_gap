import { useEffect, useState } from 'react'
import type { Dataset, Grade, Lot } from './types.ts'
import { isFlagged } from './match.ts'
import { firstRetire, isDue, turbinesOf, type Turbine } from './turbines.ts'
import { COUNTRY_LABEL, ITEM_LABEL, UNIT_LABEL, type GymLog } from './ui.ts'

export const YEAR_MIN = 2025
export const YEAR_MAX = 2040

interface Props {
  data: Dataset
  year: number
  lotId: string | null
  signed: Set<string>
  gymLog: GymLog
  onYear: (y: number) => void
  onFarm: (farmId: string) => void
  onLot: (lotId: string | null) => void
}

export default function FarmList({ data, year, lotId, signed, gymLog, onYear, onFarm, onLot }: Props) {
  const win = data.params.planning_window_years
  const [selFarm, selTurbine] = (lotId ?? '').split(':')
  const [open, setOpen] = useState<string | null>(data.farms.some((f) => f.id === selFarm) ? selFarm : (data.farms.find((f) => f.lots.some((l) => l.id === lotId))?.id ?? null))
  // Follow lot changes from outside (e.g. a link from a Week 2 report) by opening that farm.
  useEffect(() => {
    if (data.farms.some((f) => f.id === selFarm)) setOpen(selFarm)
  }, [data, selFarm])
  const farms = [...data.farms].sort(
    (a, b) => Number(isFlagged(b, year, win)) - Number(isFlagged(a, year, win)) || firstRetire(a) - firstRetire(b),
  )
  const dueCount = data.farms.reduce((s, f) => s + turbinesOf(f).filter((t) => isDue(t, year, win)).length, 0)

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
          <b className="text-orange-600">{dueCount}</b> turbines due within {win} years
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {farms.map((f) => {
          const flagged = isFlagged(f, year, win)
          const isOpen = open === f.id
          const turbines = turbinesOf(f)
          const due = turbines.filter((t) => isDue(t, year, win))
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
                    {due.length ? (
                      <span className="text-orange-600">{due.length} of {f.turbines} turbines due · first {firstRetire(f)}</span>
                    ) : (
                      <span className="text-slate-400">first turbine retires {firstRetire(f)}</span>
                    )}
                  </div>
                </div>
              </button>
              {isOpen && (
                <FarmTurbines turbines={turbines} due={due} lotId={lotId} selTurbine={selFarm === f.id ? selTurbine : undefined}
                  farmLots={f.lots} turbineCount={f.turbines} signed={signed} gymLog={gymLog} onLot={onLot} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FarmTurbines({ turbines, due, lotId, selTurbine, farmLots, turbineCount, signed, gymLog, onLot }: {
  turbines: Turbine[]; due: Turbine[]; lotId: string | null; selTurbine?: string; farmLots: Lot[]; turbineCount: number
  signed: Set<string>; gymLog: GymLog; onLot: (id: string | null) => void
}) {
  const [openT, setOpenT] = useState<string | null>(selTurbine ?? due[0]?.id ?? null)
  const [showLater, setShowLater] = useState(false)
  useEffect(() => {
    if (selTurbine) setOpenT(selTurbine)
  }, [selTurbine])
  const later = turbines.filter((t) => !due.includes(t))
  const shown = showLater ? turbines : due

  return (
    <div className="space-y-1 px-2 pb-2">
      <div className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {due.length ? 'Turbines due to retire' : 'No turbine due yet'}
      </div>
      {shown.map((t) => {
        const isOpen = openT === t.id
        const gym = t.gym_case ? gymLog[t.gym_case] : undefined
        return (
          <div key={t.id} className={`rounded-lg border bg-white ${isOpen ? 'border-slate-300' : 'border-slate-200'}`}>
            <button onClick={() => setOpenT(isOpen ? null : t.id)} className="flex w-full items-start gap-2 px-2 py-1.5 text-left">
              <span className="w-8 shrink-0 font-mono text-sm font-semibold text-navy">{t.id}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className={due.includes(t) ? 'font-medium text-orange-600' : 'text-slate-500'}>retires {t.retire_year}</span>
                  {t.gym_case && (
                    <span className={`rounded px-1 text-[10px] ${gym ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
                      {gym ? 'diagnosed in gym ✓' : 'gym case'}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] leading-snug text-slate-500 ${isOpen ? '' : 'truncate'}`}>{t.reason}</div>
              </div>
            </button>
            {isOpen && (
              <div className="space-y-1 px-2 pb-2">
                {t.lots.map((l) => <LotButton key={l.id} l={l} active={l.id === lotId} signed={signed.has(l.id)} onLot={onLot} />)}
              </div>
            )}
          </div>
        )
      })}
      {later.length > 0 && (
        <button onClick={() => setShowLater(!showLater)} className="w-full px-1 py-1 text-left text-[11px] text-accent hover:underline">
          {showLater ? 'Show only turbines due' : `+ ${later.length} later (${later[0].retire_year}–${later[later.length - 1].retire_year})`}
        </button>
      )}
      <details className="rounded-lg border border-dashed border-slate-300 bg-white/60">
        <summary className="cursor-pointer px-2 py-1.5 text-[11px] text-slate-500">Plan the whole farm at once ({turbineCount} turbines)</summary>
        <div className="space-y-1 px-2 pb-2">
          {farmLots.map((l) => <LotButton key={l.id} l={l} active={l.id === lotId} signed={signed.has(l.id)} onLot={onLot} />)}
        </div>
      </details>
    </div>
  )
}

function LotButton({ l, active, signed, onLot }: { l: Lot; active: boolean; signed: boolean; onLot: (id: string | null) => void }) {
  return (
    <button onClick={() => onLot(active ? null : l.id)}
      className={`block w-full rounded-md border px-2 py-1.5 text-left transition ${
        active ? 'border-accent bg-accent-soft/50 ring-2 ring-accent/30' : 'border-slate-200 bg-white hover:border-accent'
      }`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-navy">{ITEM_LABEL[l.item]}</span>
        <span className="flex items-center gap-1">
          {signed && <span className="text-[10px] text-emerald-600">✔ signed</span>}
          <GradeBadge g={l.grade} />
        </span>
      </div>
      <div className="text-[11px] text-slate-500">
        {l.quantity} {UNIT_LABEL[l.item]} · {l.unit_mass_t} t each{l.length_m && ` · ${l.length_m} m`}
        {l.item_status === 'waste' && ' · waste'}
      </div>
      {active && <div className="text-[10px] text-accent">Routes shown on the map →</div>}
    </button>
  )
}

export function GradeBadge({ g }: { g: Grade }) {
  const cls = { A: 'bg-emerald-100 text-emerald-700', B: 'bg-amber-100 text-amber-700', C: 'bg-rose-100 text-rose-700' }[g]
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>Grade {g}</span>
}
