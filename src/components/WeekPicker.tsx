import { WEEKS } from '../weeks'

export default function WeekPicker({ week, onChange }: { week: number; onChange: (n: number) => void }) {
  return (
    <nav className="flex max-w-full gap-0.5 overflow-x-auto">
      {WEEKS.map((w) => {
        const active = w.n === week
        return (
          <button
            key={w.n}
            onClick={() => onChange(w.n)}
            title={w.description}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-left transition-colors ${
              active ? 'text-accent-ink' : 'text-slate-500 hover:bg-white hover:text-navy'
            }`}
          >
            <div className="text-sm font-bold">
              Stage {w.n} {!w.ready && '· soon'}
            </div>
            <div className={`text-base ${active ? 'font-bold' : 'font-medium'}`}>{w.title}</div>
          </button>
        )
      })}
    </nav>
  )
}
