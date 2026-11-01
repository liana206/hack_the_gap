import type { Scenario } from '../types'

export const eur = (n: number) => `€ ${n.toLocaleString('de-CH')}`

export default function CaseFacts({ s, figure = false }: { s: Scenario; figure?: boolean }) {
  const T = s.turbine
  const lifePct = Math.min(100, (T.age_years / T.design_life_years) * 100)
  const pastLife = T.age_years >= T.design_life_years
  const repowering = T.repowering_in_years == null ? null : repoweringDate(s.decision_date, T.repowering_in_years)
  const visibleAlarms = s.alarms.filter((a) => a.t <= s.series.t[s.series.history_len - 1])

  return (
    <div className="card p-7">
      <div className={figure ? 'grid items-center gap-6 lg:grid-cols-[1fr_15rem]' : ''}>
      <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-extrabold tracking-tight text-navy">{s.title}</h2>
            <span className="rounded-full bg-teal-soft px-3 py-1 text-base font-medium text-teal">
              Synthetic data
            </span>
          </div>
          <p className="mt-1 text-lg text-slate-700">
            {T.name} · {T.farm} · {(T.rated_kw / 1000).toFixed(2)} MW · {s.component}
          </p>
        </div>
        <div className={figure ? '' : 'text-right'}>
          <div className="card-title">Decision date</div>
          <div className="text-xl font-bold text-navy">{s.decision_date.slice(0, 10)}</div>
        </div>
      </div>

      <p className="mt-4 text-lg leading-relaxed text-slate-800">{s.briefing}</p>
      </div>
      {figure && <TurbineFigure component={s.component} />}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Age vs design life">
          <div className="text-xl font-bold whitespace-nowrap text-navy">
            {T.age_years} <span className="text-base font-medium text-slate-500">/ {T.design_life_years} years</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${pastLife ? 'bg-navy' : 'bg-accent-bright'}`} style={{ width: `${lifePct}%` }} />
          </div>
          {pastLife && <div className="mt-1 text-sm text-slate-600">{T.age_years - T.design_life_years} {T.age_years - T.design_life_years === 1 ? 'year' : 'years'} past design life</div>}
        </Fact>
        <Fact label="Remaining life">
          <div className="text-xl font-bold whitespace-nowrap text-navy">
            {T.remaining_life_years} <span className="text-base font-medium text-slate-500">years</span>
          </div>
        </Fact>
        <Fact label="Warranty">
          <div className="text-xl font-bold whitespace-nowrap text-navy">{T.under_warranty ? 'Yes' : 'No'}</div>
          {T.under_warranty && <div className="text-sm text-slate-600">OEM covers planned repairs</div>}
        </Fact>
        <Fact label="Repowering">
          <div className="text-xl font-bold whitespace-nowrap text-navy">{repowering ?? 'None planned'}</div>
          {T.repowering_in_years != null && <div className="text-sm text-slate-600">{inTime(T.repowering_in_years)}</div>}
        </Fact>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Fact label="Repair cost">
          <div className="text-xl font-bold whitespace-nowrap text-navy">{eur(s.costs.maintenance_eur)}</div>
          {s.costs.maintenance_eur !== s.costs.maintenance_list_price_eur && (
            <div className="text-sm text-slate-600">list price {eur(s.costs.maintenance_list_price_eur)}</div>
          )}
        </Fact>
        <Fact label="Dismantle">
          <div className="text-xl font-bold whitespace-nowrap text-navy">{eur(s.costs.dismantle_eur)}</div>
        </Fact>
        <Fact label="Downtime">
          <div className="text-xl font-bold whitespace-nowrap text-navy">
            {eur(s.costs.downtime_per_day_eur)} <span className="text-base font-medium text-slate-500">/ day</span>
          </div>
        </Fact>
        <Fact label="Annual margin">
          <div className="text-xl font-bold whitespace-nowrap text-navy">
            {eur(T.annual_margin_eur)} <span className="text-base font-medium text-slate-500">/ yr</span>
          </div>
        </Fact>
        <Fact label="Parts resale value">
          <div className="text-xl font-bold whitespace-nowrap text-navy">{eur(s.costs.resale_parts_eur)}</div>
          <div className="text-sm text-slate-600">if dismantled intact</div>
        </Fact>
      </div>

      <div className="mt-5">
        <div className="card-title mb-2 text-base">Alarms (until decision date)</div>
        {visibleAlarms.length === 0 ? (
          <p className="text-base text-slate-500">No alarms.</p>
        ) : (
          <ul className="space-y-1.5">
            {visibleAlarms.map((a) => (
              <li key={a.t} className="flex gap-4 rounded-lg bg-amber-50 px-4 py-2.5 text-base">
                <span className="shrink-0 font-medium text-amber-700">{a.t.slice(0, 16).replace('T', ' ')}</span>
                <span className="text-slate-800">{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Side view of the turbine with the case's component lit up inside the nacelle. */
function TurbineFigure({ component }: { component: string }) {
  const part = /generator/i.test(component) ? 'generator' : 'gearbox'
  const on = '#22a447'
  const off = '#c3c8c5'
  return (
    <figure className="hidden lg:block" aria-label={`Turbine: ${component}`}>
      <svg viewBox="0 0 240 230" className="w-full" role="img">
        <title>{component}</title>
        <rect x="0" y="222" width="240" height="8" rx="4" fill="#dcdfdd" />
        <path d="M112 222 L128 222 L124 92 L116 92 Z" fill="#9aa39e" />
        <rect x="78" y="58" width="132" height="42" rx="14" fill="#2b3338" />
        <rect x="96" y="66" width="44" height="26" rx="5" fill={part === 'gearbox' ? on : off} />
        <rect x="148" y="66" width="48" height="26" rx="5" fill={part === 'generator' ? on : off} />
        <g className="origin-[66px_79px] motion-safe:animate-[spin_14s_linear_infinite]">
          {[0, 120, 240].map((a) => (
            <path key={a} d="M66 79 C 60 50, 62 22, 66 6 C 71 22, 73 50, 66 79 Z" fill="#1d4d33" transform={`rotate(${a} 66 79)`} />
          ))}
          <circle cx="66" cy="79" r="9" fill="#0e2a1c" />
        </g>
      </svg>
      <figcaption className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-navy-2">
        <span className="h-3 w-3 rounded-sm bg-accent-bright" aria-hidden="true" />
        {component}
      </figcaption>
    </figure>
  )
}

/** Decision date + N years, shown as e.g. "Aug 2025". */
function repoweringDate(decisionDate: string, years: number) {
  const d = new Date(decisionDate)
  d.setUTCMonth(d.getUTCMonth() + Math.round(years * 12))
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const inTime = (years: number) => (years < 1 ? `in ${Math.round(years * 12)} months` : `in ${years} years`)

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="card-title mb-1">{label}</div>
      {children}
    </div>
  )
}
