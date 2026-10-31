import { useMemo } from 'react'
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
  measured: '#2a78d6', // accent
  expected: '#94a3b8',
  power: '#334155',
  wind: '#1baf7a',
  ambient: '#eb6834',
  alarm: '#d97706',
  grid: '#eef2f6',
  axis: '#64748b',
}

interface Row {
  t: string
  temp: number
  expected: number
  power: number
  wind: number
  ambient: number
}

const fmtDay = (t: string) => `${t.slice(8, 10)}.${t.slice(5, 7)}.`
const fmtHour = (t: string) => `${fmtDay(t)} ${t.slice(11, 16)}`

/** Builds chart rows; before the reveal only the history (index < history_len) is included. */
function useRows(s: Scenario, revealed: boolean) {
  return useMemo(() => {
    const S = s.series
    const n = revealed ? S.t.length : S.history_len
    const rows: Row[] = []
    for (let i = 0; i < n; i++)
      rows.push({
        t: S.t[i],
        temp: S.component_temp[i],
        expected: S.component_expected[i],
        power: S.power_kw[i],
        wind: S.wind_ms[i],
        ambient: S.ambient_c[i],
      })
    // one tick every 3 days at midnight
    const ticks = rows.filter((r, i) => r.t.slice(11, 13) === '00' && Math.floor(i / 24) % 3 === 0).map((r) => r.t)
    return { rows, ticks, decisionT: S.t[S.history_len - 1], endT: rows[rows.length - 1].t }
  }, [s, revealed])
}

const axisProps = { stroke: C.axis, fontSize: 11, tickLine: false, axisLine: false } as const

function FutureShade({ revealed, decisionT, endT }: { revealed: boolean; decisionT: string; endT: string }) {
  return (
    <>
      {revealed && <ReferenceArea x1={decisionT} x2={endT} fill="#0f1e36" fillOpacity={0.05} ifOverflow="extendDomain" />}
      <ReferenceLine x={decisionT} stroke="#0f1e36" strokeDasharray="4 4" strokeOpacity={0.5} />
    </>
  )
}

function ChartTooltip({ unit, digits = 1 }: { unit: Record<string, string>; digits?: number }) {
  return (
    <Tooltip
      cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
      isAnimationActive={false}
      labelFormatter={(t) => fmtHour(String(t))}
      formatter={(v, name) => [`${Number(v).toFixed(digits)} ${unit[String(name)] ?? ''}`, String(name)]}
      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 16px rgba(15,30,54,.08)' }}
    />
  )
}

function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <svg width="18" height="6">
            <line x1="0" y1="3" x2="18" y2="3" stroke={it.color} strokeWidth="2" strokeDasharray={it.dashed ? '4 3' : undefined} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  )
}

export function TemperatureChart({ s, revealed }: { s: Scenario; revealed: boolean }) {
  const { rows, ticks, decisionT, endT } = useRows(s, revealed)
  const alarms = s.alarms.filter((a) => revealed || a.t <= decisionT)
  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="card-title">{s.component} temperature</h3>
          <p className="mt-0.5 text-sm text-slate-500">Measured vs what a healthy part would show at this power and weather</p>
        </div>
        <Legend
          items={[
            { color: C.measured, label: 'Measured' },
            { color: C.expected, label: 'Expected (healthy)', dashed: true },
            ...(alarms.length ? [{ color: C.alarm, label: 'Alarm', dashed: true }] : []),
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} syncId="case" margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="t" ticks={ticks} tickFormatter={fmtDay} {...axisProps} />
          <YAxis
            domain={[(min: number) => Math.floor((min - 2) / 10) * 10, (max: number) => Math.ceil((max + 2) / 10) * 10]}
            tickCount={6}
            tickFormatter={(v) => `${Math.round(v)}°`}
            {...axisProps}
          />
          <FutureShade revealed={revealed} decisionT={decisionT} endT={endT} />
          {alarms.map((a) => (
            <ReferenceLine key={a.t} x={rows.find((r) => r.t >= a.t)?.t} stroke={C.alarm} strokeDasharray="2 3" />
          ))}
          <ChartTooltip unit={{ Measured: '°C', Expected: '°C' }} />
          <Line name="Expected" dataKey="expected" stroke={C.expected} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} type="monotone" />
          <Line name="Measured" dataKey="temp" stroke={C.measured} strokeWidth={2} dot={false} isAnimationActive={false} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
      <ShadeNote revealed={revealed} />
    </div>
  )
}

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
      <h3 className="card-title mb-3">Operating conditions</h3>
      <div className="space-y-1">
        {panels.map((p, i) => (
          <div key={p.key} className="flex items-center gap-2">
            <div className="w-24 shrink-0 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.name}
              </div>
              <div className="pl-3.5 text-slate-400">{p.unit}</div>
            </div>
            <ResponsiveContainer width="100%" height={i === panels.length - 1 ? 92 : 72}>
              <LineChart data={rows} syncId="case" margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="t" ticks={ticks} tickFormatter={fmtDay} hide={i !== panels.length - 1} {...axisProps} />
                <YAxis tickCount={3} tickFormatter={p.fmt} {...axisProps} />
                <FutureShade revealed={revealed} decisionT={decisionT} endT={endT} />
                <ChartTooltip unit={{ [p.name]: p.unit }} digits={p.digits} />
                <Line name={p.name} dataKey={p.key} stroke={p.color} strokeWidth={1.5} dot={false} isAnimationActive={false} type="monotone" />
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
    <p className="mt-2 text-xs text-slate-400">
      {revealed
        ? 'Dashed line = your decision date. Shaded area = what happened afterwards (hidden while you decided).'
        : 'Dashed line = decision date. You only see the history; the future is hidden until you decide.'}
    </p>
  )
}
