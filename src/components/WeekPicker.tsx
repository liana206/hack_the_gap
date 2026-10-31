import { WEEKS } from '../weeks'

export default function WeekPicker({ week, onChange }: { week: number; onChange: (n: number) => void }) {
  return (
    <nav className="flex gap-2">
      {WEEKS.map((w) => {
        const active = w.n === week
        return (
          <button
            key={w.n}
            onClick={() => onChange(w.n)}
            title={w.description}
            className={`rounded-xl px-4 py-2 text-left transition ${
              active ? 'bg-white text-navy shadow' : 'text-slate-300 hover:bg-navy-2 hover:text-white'
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
              Week {w.n} {!w.ready && '· soon'}
            </div>
            <div className="text-sm font-medium">{w.title}</div>
          </button>
        )
      })}
    </nav>
  )
}
