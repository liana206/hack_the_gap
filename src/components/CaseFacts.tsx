import type { Scenario } from '../types'

export const eur = (n: number) => `€ ${n.toLocaleString('de-CH')}`

export default function CaseFacts({ s }: { s: Scenario }) {
  const T = s.turbine
  const lifePct = Math.min(100, (T.age_years / T.design_life_years) * 100)
  const pastLife = T.age_years >= T.design_life_years
  const visibleAlarms = s.alarms.filter((a) => a.t <= s.series.t[s.series.history_len - 1])

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-navy">{s.title}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {s.source === 'care' ? 'Real data · CARE to Compare' : 'Synthetic data'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {T.name} · {T.farm} · {(T.rated_kw / 1000).toFixed(2)} MW · {s.component}
          </p>
        </div>
        <div className="text-right">
          <div className="card-title">Decision date</div>
          <div className="text-sm font-medium text-slate-700">{s.decision_date.slice(0, 10)}</div>
        </div>
      </div>

      <p className="mt-4 leading-relaxed text-slate-700">{s.briefing}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Age vs design life">
          <div className="text-lg font-semibold text-slate-800">
            {T.age_years} <span className="text-sm font-normal text-slate-400">/ {T.design_life_years} years</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${pastLife ? 'bg-slate-700' : 'bg-accent'}`} style={{ width: `${lifePct}%` }} />
          </div>
          {pastLife && <div className="mt-1 text-xs text-slate-500">{T.age_years - T.design_life_years} years past design life</div>}
        </Fact>
        <Fact label="Maintenance / repair">
          <div className="text-lg font-semibold text-slate-800">{eur(s.costs.maintenance_eur)}</div>
        </Fact>
        <Fact label="Dismantle">
          <div className="text-lg font-semibold text-slate-800">{eur(s.costs.dismantle_eur)}</div>
        </Fact>
        <Fact label="Downtime">
          <div className="text-lg font-semibold text-slate-800">
            {eur(s.costs.downtime_per_day_eur)} <span className="text-sm font-normal text-slate-400">/ day</span>
          </div>
        </Fact>
      </div>

      <div className="mt-5">
        <div className="card-title mb-2">Alarms (until decision date)</div>
        {visibleAlarms.length === 0 ? (
          <p className="text-sm text-slate-400">No alarms.</p>
        ) : (
          <ul className="space-y-1.5">
            {visibleAlarms.map((a) => (
              <li key={a.t} className="flex gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm">
                <span className="font-mono text-xs leading-5 text-amber-700">{a.t.slice(0, 16).replace('T', ' ')}</span>
                <span className="text-slate-700">{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5">
      <div className="card-title mb-1">{label}</div>
      {children}
    </div>
  )
}
