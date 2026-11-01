// Drawn check / cross / warning marks (text glyphs render differently on every laptop).

const PATHS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cross: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  warn: 'M12 4v10M12 19v.5',
}

export default function Mark({ kind, className = '' }: { kind: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`inline-block h-[1em] w-[1em] shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[kind]} />
    </svg>
  )
}
