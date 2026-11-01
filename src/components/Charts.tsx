import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Scenario } from '../types'

const C = {
  measured: '#1d4d33', // forest
  expected: '#8fae9c', // sage
  power: '#22a447', // green
  wind: '#2b6f80', // teal-blue
  ambient: '#8fae9c', // sage
  alarm: '#a8660c',
  gap: '#1d4d33',
  gapHigh: '#b3363c',
  band: '#22a447',
  grid: '#e5e8e6',
  axis: '#5f6863',
  ink: '#0e2a1c',
}

interface Row {
  t: string
  temp: number
  expected: number
  tempAvg: number // 24 h trailing mean
  expectedAvg: number
  gap: number | null // series.gap_24h; null until a full 24 h window exists
  power: number
  wind: number
  ambient: number
}

const fmtDay = (t: string) => `${t.slice(8, 10)}.${t.slice(5, 7)}.`
const fmtHour = (t: string) => `${fmtDay(t)} ${t.slice(11, 16)}`

/** Trailing mean over the last `w` points: uses only past values, so it never leaks the hidden future. */
function rollingMean(xs: number[], w: number): number[] {
  let sum = 0
  return xs.map((x, i) => {
    sum += x
    if (i >= w) sum -= xs[i - w]
    return Math.round((sum / Math.min(i + 1, w)) * 10) / 10
  })
}

/** Builds chart rows; before the reveal only the history (index < history_len) is included. */
function useRows(s: Scenario, revealed: boolean) {
  return useMemo(() => {
    const S = s.series
    const n = revealed ? S.t.length : S.history_len
    const tempAvg = rollingMean(S.component_temp, 24)
    const expectedAvg = rollingMean(S.component_expected, 24)
    const rows: Row[] = []
    for (let i = 0; i < n; i++)
      rows.push({
        t: S.t[i],
        temp: S.component_temp[i],
        expected: S.component_expected[i],
        tempAvg: tempAvg[i],
        expectedAvg: expectedAvg[i],
        gap: i >= 23 ? S.gap_24h[i] : null,
        power: S.power_kw[i],
        wind: S.wind_ms[i],
        ambient: S.ambient_c[i],
      })
    // one tick every 3 days at midnight
    const ticks = rows.filter((r, i) => r.t.slice(11, 13) === '00' && Math.floor(i / 24) % 3 === 0).map((r) => r.t)
    return { rows, ticks, decisionT: S.t[S.history_len - 1], endT: rows[rows.length - 1].t }
  }, [s, revealed])
}

const axisProps = { stroke: C.axis, fontSize: 14, tickLine: false, axisLine: false } as const

/** Only temperature alarms belong on temperature charts; others (e.g. SCADA comms) stay in the alarm list. */
const isTempAlarm = (text: string) => /temperat/i.test(text)

function AlarmLines({ s, rows, revealed, decisionT }: { s: Scenario; rows: Row[]; revealed: boolean; decisionT: string }) {
  return (
    <>
      {s.alarms
        .filter((a) => isTempAlarm(a.text) && (revealed || a.t <= decisionT))
        .map((a) => (
          <ReferenceLine key={a.t} x={rows.find((r) => r.t >= a.t)?.t} stroke={C.alarm} strokeDasharray="2 3" />
        ))}
    </>
  )
}

function FutureShade({ revealed, decisionT, endT }: { revealed: boolean; decisionT: string; endT: string }) {
  return (
    <>
      {revealed && <ReferenceArea x1={decisionT} x2={endT} fill={C.ink} fillOpacity={0.05} ifOverflow="extendDomain" />}
      <ReferenceLine x={decisionT} stroke={C.ink} strokeDasharray="4 4" strokeOpacity={0.5} />
    </>
  )
}

function ChartTooltip({ unit, digits = 1 }: { unit: Record<string, string>; digits?: number }) {
  return (
    <Tooltip
      cursor={{ stroke: C.expected, strokeWidth: 1 }}
      isAnimationActive={false}
      labelFormatter={(t) => fmtHour(String(t))}
      formatter={(v, name) => [`${Number(v).toFixed(digits)} ${unit[String(name)] ?? ''}`, String(name)]}
      contentStyle={{ borderRadius: 8, border: '1px solid #dcdfdd', fontSize: 15, fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(14,42,28,.08)' }}
    />
  )
}

function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-slate-700">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <svg width="18" height="6">
            <line x1="0" y1="3" x2="18" y2="3" stroke={it.color} strokeWidth="2.5" strokeDasharray={it.dashed ? '4 3' : undefined} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  )
}

export function TemperatureChart({ s, revealed }: { s: Scenario; revealed: boolean }) {
  const { rows, ticks, decisionT, endT } = useRows(s, revealed)
  const [hourly, setHourly] = useState(false)
  const hasAlarms = s.alarms.some((a) => isTempAlarm(a.text) && (revealed || a.t <= decisionT))
  const avg = hourly ? '' : ' (24 h avg)'
  // Evenly spaced y ticks (steps of 10, or 20 for a wide range) around the lines currently shown.
  const shown = rows.flatMap((r) => (hourly ? [r.temp, r.expected] : [r.tempAvg, r.expectedAvg]))
  const lo = Math.min(...shown) - 2
  const hi = Math.max(...shown) + 2
  const step = hi - lo > 60 ? 20 : 10
  const yMin = Math.floor(lo / step) * step
  const yMax = Math.ceil(hi / step) * step
  const yTicks = Array.from({ length: (yMax - yMin) / step + 1 }, (_, i) => yMin + i * step)
  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold text-navy">{s.component} temperature</h3>
          <p className="mt-0.5 text-base text-slate-700">Measured vs what a healthy part would show at this power and weather</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Legend
            items={[
              { color: C.measured, label: 'Measured' },
              { color: C.expected, label: 'Expected (healthy)', dashed: true },
              ...(hasAlarms ? [{ color: C.alarm, label: 'Temperature alarm', dashed: true }] : []),
            ]}
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={hourly} onChange={(e) => setHourly(e.target.checked)} className="accent-accent" />
            show hourly values
          </label>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows} syncId="case" margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="t" ticks={ticks} tickFormatter={fmtDay} {...axisProps} />
          <YAxis
            domain={[yMin, yMax]}
            ticks={yTicks}
            tickFormatter={(v) => `${Math.round(v)}°`}
            {...axisProps}
          />
          <FutureShade revealed={revealed} decisionT={decisionT} endT={endT} />
          <AlarmLines s={s} rows={rows} revealed={revealed} decisionT={decisionT} />
          <ChartTooltip unit={{ ['Measured' + avg]: '°C', ['Expected' + avg]: '°C' }} />
          <Line name={'Expected' + avg} dataKey={hourly ? 'expected' : 'expectedAvg'} stroke={C.expected} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} type="monotone" />
          <Line name={'Measured' + avg} dataKey={hourly ? 'temp' : 'tempAvg'} stroke={C.measured} strokeWidth={3} dot={false} isAnimationActive={false} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
      <ShadeNote revealed={revealed} />
    </div>
  )
}

const BAND = 2 // °C: |gap| up to this is normal scatter

/** Measured minus expected, 24 h average. The chart the junior should learn to judge by. */
export function GapChart({ s, revealed, showHint, strip = false }: { s: Scenario; revealed: boolean; showHint: boolean; strip?: boolean }) {
  const { rows, ticks, decisionT, endT } = useRows(s, revealed)
  // Axis at least -5..+5 so a healthy case looks calm; computed from the rows shown, so it never hints at the future.
  const gaps = rows.map((r) => r.gap).filter((g): g is number => g !== null)
  const dataMin = Math.min(...gaps)
  const dataMax = Math.max(...gaps)
  const yMin = Math.min(-5, Math.floor((dataMin - 1) / 5) * 5)
  const yMax = Math.max(5, Math.ceil((dataMax + 1) / 5) * 5)
  const step = yMax - yMin > 30 ? 10 : 5
  const yTicks = Array.from({ length: Math.floor((yMax - yMin) / step) + 1 }, (_, i) => yMin + i * step)
  // Line colour switches to red above +BAND: a vertical gradient over the line's own bounding box (data min..max).
  const split = dataMax > BAND ? Math.min(1, (dataMax - BAND) / (dataMax - dataMin || 1)) : 0
  const gradId = `gap-${s.id}`

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold text-navy">Gap: measured − expected (24 h average)</h3>
          <p className="mt-0.5 text-base text-slate-700">How much warmer the part runs than a healthy one would</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded-sm" style={{ background: C.band, opacity: 0.2 }} />
            Normal range ±{BAND} °C
          </span>
          <Legend items={[{ color: C.gap, label: 'Gap' }, { color: C.gapHigh, label: `Above +${BAND} °C` }]} />
        </div>
      </div>
      {strip && <DayStrip s={s} revealed={revealed} />}
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={rows} syncId="case" margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor={split > 0 ? C.gapHigh : C.gap} />
              <stop offset={split} stopColor={split > 0 ? C.gapHigh : C.gap} />
              <stop offset={split} stopColor={C.gap} />
              <stop offset={1} stopColor={C.gap} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="t" ticks={ticks} tickFormatter={fmtDay} {...axisProps} />
          <YAxis domain={[yMin, yMax]} ticks={yTicks} allowDataOverflow tickFormatter={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}°`} {...axisProps} />
          <ReferenceArea
            y1={-BAND}
            y2={BAND}
            fill={C.band}
            fillOpacity={0.12}
            label={{ value: 'normal range', position: 'insideTopLeft', fontSize: 14, fill: C.ink }}
          />
          <ReferenceLine y={0} stroke={C.expected} strokeWidth={1} />
          <FutureShade revealed={revealed} decisionT={decisionT} endT={endT} />
          <AlarmLines s={s} rows={rows} revealed={revealed} decisionT={decisionT} />
          <ChartTooltip unit={{ Gap: '°C' }} />
          <Line name="Gap" dataKey="gap" stroke={`url(#${gradId})`} strokeWidth={3} dot={false} isAnimationActive={false} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
      {showHint && (
        <p className="mt-3 rounded-lg bg-slate-50 px-4 py-2.5 text-base text-slate-800">
          <b className="font-semibold text-navy">Tip:</b> Judge the gap, not the temperature: a gap that stays inside the band is normal, a gap that keeps growing is a
          developing fault.
        </p>
      )}
      <ShadeNote revealed={revealed} />
    </div>
  )
}

/** One block per day, coloured by that day's gap: greens inside the band, amber then red above it. History only until the reveal. */
function DayStrip({ s, revealed }: { s: Scenario; revealed: boolean }) {
  const S = s.series
  const n = revealed ? S.t.length : S.history_len
  const days = Array.from({ length: Math.floor(n / 24) }, (_, d) => ({ t: S.t[d * 24], gap: S.gap_24h[d * 24 + 23], future: d * 24 >= S.history_len }))
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm font-bold text-navy-2">Daily gap</span>
      <div className="flex flex-1 gap-1">
        {days.map((d) => (
          <span
            key={d.t}
            title={`${fmtDay(d.t)}: ${d.gap > 0 ? '+' : ''}${d.gap.toFixed(1)} °C`}
            className={`h-10 flex-1 rounded-md ${d.future ? 'opacity-60' : ''}`}
            style={{ background: dayColor(d.gap) }}
          />
        ))}
      </div>
    </div>
  )
}

const dayColor = (g: number) =>
  g > 4 ? C.gapHigh : g > BAND ? '#d98a3a' : g < -BAND ? '#2b6f80' : ['#d4ebdb', '#a6d6b4', '#62b47d', '#2f8f4e'][Math.min(3, Math.floor(Math.abs(g) / 0.5))]

/** Power, wind and outside temperature: three small charts on a shared time axis (no dual y-axes). */
export function ConditionsChart({ s, revealed }: { s: Scenario; revealed: boolean }) {
  const { rows, ticks, decisionT, endT } = useRows(s, revealed)
  const panels = [
    { key: 'power', name: 'Power', unit: 'kW', color: C.power, digits: 0, fmt: (v: number) => `${Math.round(v / 100) / 10}k` },
    { key: 'wind', name: 'Wind speed', unit: 'm/s', color: C.wind, digits: 1, fmt: (v: number) => `${Math.round(v)}` },
    { key: 'ambient', name: 'Outside temp.', unit: '°C', color: C.ambient, digits: 1, fmt: (v: number) => `${Math.round(v)}°` },
  ] as const
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-xl font-bold text-navy">Operating conditions</h3>
      <div className="space-y-1">
        {panels.map((p, i) => (
          <div key={p.key} className="flex items-center gap-2">
            <div className="w-32 shrink-0 text-sm text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-navy">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                {p.name}
              </div>
              <div className="pl-3.5 text-slate-500">{p.unit}</div>
            </div>
            <ResponsiveContainer width="100%" height={i === panels.length - 1 ? 108 : 84}>
              <LineChart data={rows} syncId="case" margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="t" ticks={ticks} tickFormatter={fmtDay} hide={i !== panels.length - 1} {...axisProps} />
                <YAxis tickCount={3} tickFormatter={p.fmt} {...axisProps} />
                <FutureShade revealed={revealed} decisionT={decisionT} endT={endT} />
                <ChartTooltip unit={{ [p.name]: p.unit }} digits={p.digits} />
                <Line name={p.name} dataKey={p.key} stroke={p.color} strokeWidth={2} dot={false} isAnimationActive={false} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
      <ShadeNote revealed={revealed} />
    </div>
  )
}

function ShadeNote({ revealed }: { revealed: boolean }) {
  return (
    <p className="mt-2 text-sm text-slate-600">
      {revealed
        ? 'Dashed line = your decision date. Shaded area = what happened afterwards (hidden while you decided).'
        : 'Dashed line = decision date. You only see the history; the future is hidden until you decide.'}
    </p>
  )
}
