# UI Redesign Spec: Onboarding to Ownership

Oct 31, 2026 · @jasmy

## Scope and how to apply

This spec rebuilds the redesigned frontend of the Hack the Gap app (React 19 + Tailwind v4 + Recharts + Leaflet) on any later version of the repo. It is self-contained: every token, size, colour and new component is listed here, so it can be applied by hand or by a coding agent without the original branch.

In short: one self-hosted typeface (DM Sans), a projector-sized type scale, a neutral grey page with white cards, one green for selection and the main action, teal-blue and sage for secondary data, and a muted red only for wrong answers. Every week also gets a dark case deck, a drawn turbine, a daily gap heat strip and a green learning log card.

**Order of work**

1. Add the font file and replace the global CSS (sections 2 and 5). Most colour changes follow automatically, because the theme remaps the Tailwind scales the components already use (`slate`, `emerald`, `rose`, `amber`, plus `navy` and `accent`).
2. Add the shared `Mark` icon component (section 5).
3. Apply the per-component class changes (sections 6 to 11).
4. Add the three new pieces: `CaseDeck`, `TurbineFigure`, `DayStrip` (sections 7 to 9).
5. Run the checklist (section 12).

**Week 1 look for all weeks.** Apply everything in this spec to weeks 1 to 4. The source branch limits some parts to Week 1 with a `src/App.tsx` flag (v2 = weekN === 1); in the target repo, leave the flag out and always use the new version: the case deck, the green learning log card, the turbine figure, the daily gap strip and the new header, in every week.

**Files**

| File | Change |
| --- | --- |
| `public/fonts/dm-sans-latin-wght-normal.woff2` | New. DM Sans variable font, SIL Open Font License |
| `index.html` | Font preload link; body class removed |
| `src/index.css` | Rewritten: font face, theme tokens, root scale, card styles |
| `src/components/Mark.tsx` | New. Drawn check, cross and warning icons |
| `src/components/CaseDeck.tsx` | New. Dark, vertically scrolling case deck (replaces CaseList) |
| `src/App.tsx` | Header, sidebar, learning log |
| `src/components/WeekPicker.tsx` | Tab styles |
| `src/components/CaseList.tsx` | Delete: replaced by CaseDeck in every week |
| `src/components/CaseFacts.tsx` | Sizes, colours, `TurbineFigure` |
| `src/components/Charts.tsx` | Colours, sizes, line widths, `DayStrip` |
| `src/components/DecisionPanel.tsx` | Sizes, colours, plain icons |
| `src/components/Reveal.tsx` | Sizes, colours, icons |
| `src/components/SeniorChat.tsx` | Sizes, colours, emoji removed |
| `src/reuse/*.tsx`, `src/reuse/ui.ts` | Week 4 map colours, label sizes, icons |

**Design only, not content.** This is a visual change. Keep every heading, label, sentence, number and data value as it is in the target repo. If the target repo's text differs from the text in the code samples here, keep the target repo's text and copy only the classes and structure. If applying any part of this spec would change, add or remove visible text beyond the list below, stop and ask for approval first.

| Approved text change | Where |
| --- | --- |
| Page title "Turbine Judgement Gym" becomes "Onboarding to Ownership" | h1 in `src/App.tsx`, all weeks |
| "Alpiq · Hack the Gap" line above the title removed | header |
| ✓ ✗ ✔ ✖ glyphs become drawn icons; the words beside them stay | `CaseList`, `Reveal`, `FarmList`, `PlanPanel` |
| "⚠️ " removed from "Could not reach the senior…" | `SeniorChat` |
| New label "Daily gap" | gap chart |
| New done count ("2/6") next to "Cases" | case deck |

Needs approval before changing: the browser tab `<title>`, which still says "Turbine Judgement Gym".

Also unchanged: scoring logic, scenario data, the senior prompt, the `#/map?…` hash parameters and form behaviour.

## Fonts and design tokens

One typeface, DM Sans, self-hosted so the demo works offline. The root font size is 112.5% (18px), so every rem-based Tailwind size and spacing grows by an eighth for the projector.

**Font file.** Download the latin variable file and save it as `public/fonts/dm-sans-latin-wght-normal.woff2`:

```text
https://cdn.jsdelivr.net/npm/@fontsource-variable/dm-sans@5.1.0/files/dm-sans-latin-wght-normal.woff2
```

**`index.html`.** Add the preload after `<title>`, and remove `class="bg-slate-100"` from `<body>` (the CSS sets the page colour):

```html
<link rel="preload" href="/fonts/dm-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />
```

**Tokens.** These go in the `@theme` block of `src/index.css` (full file in section 5). The Tailwind scales `slate`, `emerald`, `rose` and `amber` are overridden so existing classes such as `text-slate-500` pick up the new palette without edits.

| Token (Tailwind name) | Hex | Role |
| --- | --- | --- |
| `navy` | #0e2a1c | Forest ink: headings, big values |
| `navy-2` | #1d4d33 | Forest: labels, section titles, learning log card |
| `accent` | #16843b | Green: selected case, primary buttons, "Right call" banner |
| `accent-ink` | #136f32 | Green text on light grounds (active week, met checks, best cost) |
| `accent-bright` | #22a447 | Green data marks: progress bar, ticks, power line |
| `accent-soft` | #e6f2ea | Pale green: selected answer card, met-check rows, "best" chip |
| `teal` | #2b6f80 | Teal-blue: chips, Sandra's avatar and replies, wind line, done-case ticks (weeks 2 and 3) |
| `teal-soft` | #dcecef | Pale teal-blue: "Synthetic data" and "you" chips |
| `sage` | #9cb8a8 | Sage: expected line, outside temperature (charts use #8fae9c) |
| `ground` | #eef0ef | Page background, also behind the header |
| `deck` | #2b3338 | Dark charcoal: the case deck |
| `slate-50` | #f5f6f5 | Fact tiles, answer cards, chat bubbles |
| `slate-100` | #ebedec | Light fills |
| `slate-200` | #dcdfdd | Borders, progress track |
| `slate-300` | #c3c8c5 | Input borders |
| `slate-400` | #5f6863 | Secondary text (passes 4.5:1 on white) |
| `slate-500` | #525a56 | Secondary text |
| `slate-600` | #414845 | Body text, softer |
| `slate-700` | #2e3431 | Body text |
| `slate-800` | #1c201e | Main reading text |
| `slate-900` | #111412 | Darkest text |
| `emerald-50` / `100` / `600` / `700` / `800` | #e6f4ec / #cfe9da / #1f7a4d / #186640 / #12512f | Good (forest greens) |
| `rose-50` / `100` / `400` / `600` / `700` | #fbeceb / #f6d5d3 / #c4545a / #b3363c / #9b2c31 | Bad: the only red; wrong answers, failed checks |
| `amber-50` / `100` / `200` / `600` / `700` / `800` | #fbf5e6 / #f4e6c2 / #ead39a / #a8660c / #8a5310 / #6f4310 | Warning: alarms, pseudo-data notes |

Font stack: `"DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. All numbers use `tabular-nums` (set on `body`).

## Type scale

Sizes are Tailwind classes; with the 18px root they render at the px shown. Weights: 400 body, 500 secondary, 600 to 700 labels and values, 800 (`font-extrabold`) for the big headings. Large headings use `tracking-tight` (-0.025em).

| Element | Classes | px |
| --- | --- | --- |
| Page title (h1), from 768px | `md:text-[2.75rem] font-extrabold leading-none tracking-tight` | 49.5 |
| Page title (h1), phone | `text-4xl` (Week 1) / `text-3xl` (other weeks) | 40.5 / 33.75 |
| Learning log score | `text-6xl font-extrabold`, the "/6" `text-3xl` | 67.5 / 33.75 |
| Case title (h2) | `text-4xl font-extrabold tracking-tight` | 40.5 |
| "Your call" (h3), reveal banner | `text-3xl font-extrabold tracking-tight` | 33.75 |
| "Cases" in the deck | `text-2xl font-bold` | 27 |
| Chart titles (h3), Sandra's name, answer titles | `text-xl font-bold` | 22.5 |
| Fact values ("€ 25'000", "6") | `text-xl font-bold whitespace-nowrap` | 22.5 |
| Decision date value | `text-xl font-bold` | 22.5 |
| Briefing, case meta line, reveal paragraphs, chat bubbles, reasoning input, cost table | `text-lg` | 20.25 |
| Week tab title | `text-base` (bold when active, medium otherwise) | 18 |
| Body: case names, chart subtitles, answer detail, learning log lines, alarms, tip box | `text-base` | 18 |
| Fact units ("/ 20 years", "/ day") | `text-base font-medium` | 18 |
| Labels (`.card-title`): fact labels, "Decision date", "What happened" | `text-sm font-bold` (`text-base` where noted) | 15.75 / 18 |
| Week tab label ("Week 1"), chips, legends, footnotes, case "Week 1" line | `text-sm` | 15.75 |
| Chart axis ticks | Recharts `fontSize: 14` | 14 |
| Chart tooltip | `fontSize: 15` | 15 |
| Week 4 smallest labels | `text-xs` (was 10 to 11px) | 13.5 |

No text is uppercase or letter-spaced; labels are sentence case. Nothing renders under 13.5px except the 11px distance labels on the Week 4 map lines.

## Colour usage

Green means "selected" or "act" and appears in few places; most of the page is neutral grey, white and forest ink. Red appears only for a wrong answer or a failed check, amber only where the data warns.

| Where | Colour |
| --- | --- |
| Page background and header | `ground` #eef0ef (no separate header bar) |
| Cards | white, `rounded-2xl`, no border, no shadow |
| Fact tiles, answer cards, chat bubbles, tip box | `slate-50` #f5f6f5 |
| Headings and big values | `navy` #0e2a1c |
| Labels and section titles | `navy-2` #1d4d33 |
| Active week tab | text `accent-ink` #136f32, bold, no fill |
| Inactive week tabs | text `slate-500`, hover white fill |
| Case deck | `deck` #2b3338, white text; selected case is a white card with `navy` text |
| Week 1 learning log | `navy-2` #1d4d33 fill, white text |
| Selected case (weeks 2 and 3 list) | `accent` #16843b fill, white text |
| Primary buttons ("Lock in decision & reveal", "Ask") | `accent` fill, white bold text, hover `accent-ink` |
| Selected answer card | 2px `accent` border on `accent-soft` #e6f2ea |
| "Right call" banner | `accent` fill, white text |
| "Not the right call" banner | `rose-700` #9b2c31 fill, white text |
| Correct mark (tick) | `accent-bright` #22a447 circle, white tick |
| Wrong mark (cross) | `rose-600` #b3363c circle, white cross |
| Not played | empty ring, 2px, 40% opacity |
| Met reasoning checks | `accent-soft` row, `accent-ink` text; missed checks `slate-500` |
| "Synthetic data", "you" chips, week-3 feature chips | `teal-soft` #dcecef fill, `teal` #2b6f80 text |
| "best" chip | `accent-soft` fill, `accent-ink` text |
| Sandra avatar, user's chat bubbles | `teal` fill, white text |
| Decision icons | `teal`; `accent` when selected |
| Age progress bar | `accent-bright` on `slate-200`; `navy` when past design life |
| Alarms | `amber-50` row, `amber-700` timestamp |
| Error banner | `rose-50` fill, `rose-700` text |
| Focus ring | 2px `accent` outline, 2px offset |

**Chart colours** (the `C` object in `src/components/Charts.tsx`):

| Key | Hex | Use |
| --- | --- | --- |
| `measured` | #1d4d33 | Measured temperature, 3px |
| `expected` | #8fae9c | Expected temperature, 2px dashed 5/4; zero line; tooltip cursor |
| `gap` | #1d4d33 | Gap line, 3px |
| `gapHigh` | #b3363c | Gap above +2 °C |
| `band` | #22a447 | Normal-range band at 12% opacity |
| `power` | #22a447 | Power, 2px |
| `wind` | #2b6f80 | Wind speed, 2px |
| `ambient` | #8fae9c | Outside temperature, 2px |
| `alarm` | #a8660c | Temperature alarm lines, dashed 2/3 |
| `grid` | #e5e8e6 | Horizontal grid lines |
| `axis` | #5f6863 | Axis tick text |
| `ink` | #0e2a1c | Decision-date line (50%), future shade (5%), "normal range" label |

## Global CSS and shared components

Replace `src/index.css` with this file. The Leaflet and Recharts rules at the end were already in the repo; keep any other rules your version has added.

```css
@import "tailwindcss";

/* DM Sans (SIL Open Font License), bundled so the demo works offline. */
@font-face {
  font-family: "DM Sans";
  font-style: normal;
  font-weight: 100 1000;
  font-display: swap;
  src: url("/fonts/dm-sans-latin-wght-normal.woff2") format("woff2");
}

/* Pitch palette: near-black forest ink on a neutral grey ground, white cards.
   One green for selection and the main action; teal-blue and sage carry secondary data.
   The framework scales below are remapped, so existing classes follow. */
@theme {
  --color-navy: #0e2a1c;
  --color-navy-2: #1d4d33;
  --color-accent: #16843b;
  --color-accent-ink: #136f32;
  --color-accent-bright: #22a447;
  --color-accent-soft: #e6f2ea;
  --color-teal: #2b6f80;
  --color-teal-soft: #dcecef;
  --color-sage: #9cb8a8;
  --color-ground: #eef0ef;
  --color-deck: #2b3338;

  --color-slate-50: #f5f6f5;
  --color-slate-100: #ebedec;
  --color-slate-200: #dcdfdd;
  --color-slate-300: #c3c8c5;
  --color-slate-400: #5f6863;
  --color-slate-500: #525a56;
  --color-slate-600: #414845;
  --color-slate-700: #2e3431;
  --color-slate-800: #1c201e;
  --color-slate-900: #111412;

  --color-emerald-50: #e6f4ec;
  --color-emerald-100: #cfe9da;
  --color-emerald-600: #1f7a4d;
  --color-emerald-700: #186640;
  --color-emerald-800: #12512f;

  --color-rose-50: #fbeceb;
  --color-rose-100: #f6d5d3;
  --color-rose-400: #c4545a;
  --color-rose-600: #b3363c;
  --color-rose-700: #9b2c31;

  --color-amber-50: #fbf5e6;
  --color-amber-100: #f4e6c2;
  --color-amber-200: #ead39a;
  --color-amber-600: #a8660c;
  --color-amber-700: #8a5310;
  --color-amber-800: #6f4310;

  --font-sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

@layer base {
  /* Projector scale: every rem-based size grows by an eighth */
  html { font-size: 112.5%; }
  body {
    background: var(--color-ground);
    font-variant-numeric: tabular-nums;
  }
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}

@layer components {
  .card { @apply rounded-2xl bg-white; }
  .card-title { @apply text-sm font-bold text-navy-2; }
}

.reuse-tiles { filter: grayscale(0.85) brightness(1.04) contrast(0.9); }

.leaflet-tooltip.km-label {
  padding: 0 4px;
  border: 0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 2px rgba(15, 61, 46, 0.2);
  color: #0e2a1c;
  font-size: 11px;
  font-weight: 600;
}
.leaflet-tooltip.km-label::before { display: none; }

/* Recharts measures tick labels in an off-screen span; keep it invisible too */
#recharts_measurement_span { visibility: hidden; }

.recharts-wrapper:focus,
.recharts-surface:focus { outline: none; }

/* Leaflet zoom buttons default to Lucida Console; use the app face */
.leaflet-control-zoom a { font-family: inherit; }

/* Case deck: a thin light scrollbar shows there are more cases below */
.deck-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.35) transparent;
}
```

**`src/components/Mark.tsx` (new).** Replaces every ✓ ✗ ✔ ✖ ⚠️ glyph; it sizes to the surrounding text (1em) and takes its colour from `currentColor`.

```tsx
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
```

Replacements: `CaseList` (result circle), `Reveal` (banner and reasoning checks), `FarmList` ("signed"), `PlanPanel` (plan checks: `check` / `cross` / `warn`; "signed"; "Proposed"). In `SeniorChat`, the "⚠️ " prefix is removed from the "Could not reach the senior" message.

## Layout and header

The header sits on the page background (no bar): the title on the left, the four week tabs on its right, on one row at 1440px and wider. The page is a 1600px-wide frame with 36px side padding.

| Part | Value |
| --- | --- |
| Page frame | `mx-auto max-w-[1600px] px-8` (36px each side) |
| Header row | `flex flex-wrap items-center justify-between gap-x-8 gap-y-4 pb-2 pt-8` |
| Content grid | `grid gap-6 lg:grid-cols-[17rem_1fr]`, `py-8` |
| Sidebar width | `17rem` (306px) |
| Gap between cards | `gap-6` / `space-y-6` (27px); sidebar `space-y-4` (18px) |
| Card padding | case facts, decision, reveal, chat `p-7` (31.5px); charts `p-5`; learning log `p-5` |
| Week 4 frame | `max-w-[1900px] px-8 py-3`, height `calc(100vh - 6.5rem)` |

**Header (`src/App.tsx`).** The same header in every week:

```tsx
<header>
  <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-8 pb-2 pt-8">
    <h1 className="text-4xl font-extrabold leading-none tracking-tight text-navy md:text-[2.75rem]">Onboarding to Ownership</h1>
    <WeekPicker week={weekN} onChange={setWeekN} />
  </div>
</header>
```

The browser tab `<title>` in `index.html` still says "Turbine Judgement Gym" (open question in section 12).

**Week tabs (`src/components/WeekPicker.tsx`).** No fill on the active tab; it is marked by green bold text.

```tsx
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
        <div className="text-sm font-bold">Week {w.n} {!w.ready && '· soon'}</div>
        <div className={`text-base ${active ? 'font-bold' : 'font-medium'}`}>{w.title}</div>
      </button>
    )
  })}
</nav>
```

**Old case list.** `src/components/CaseList.tsx` and its white `card p-4` wrapper are replaced by the case deck (section 7) in every week; delete them.

## Case deck

In every week, the case list becomes a dark charcoal deck in the sidebar, with two card edges stacked behind it. About four cases show at once; the rest slide into view by scrolling vertically (wheel or trackpad), and each case snaps into place. There are no arrow buttons.

| Part | Spec |
| --- | --- |
| Back card 1 | `absolute inset-x-8 top-0 h-10 rounded-t-2xl bg-slate-400` |
| Back card 2 | `absolute inset-x-4 top-2.5 h-10 rounded-t-2xl bg-slate-600` |
| Deck card | `relative rounded-2xl bg-deck p-5 text-white`, wrapper `relative pt-5` |
| Header | "Cases" `text-2xl font-bold`; done count "2/6" in a `bg-white/15` pill, `text-base font-semibold` |
| Scroll area | `max-h-[23rem]` (414px), `overflow-y-auto snap-y snap-mandatory overscroll-contain`, items `snap-start`, `space-y-1`; class `deck-scroll` gives a thin white scrollbar |
| Case row | `rounded-xl px-3 py-2.5`; title `text-base font-bold leading-snug`; "Week 1" `text-sm text-white/70` |
| Selected row | white card: `bg-white text-navy`, its "Week 1" line `text-teal` |
| Hover | `bg-white/10` |
| Status (right side, 32px) | correct: `bg-accent-bright` circle + white tick; wrong: `bg-rose-600` circle + white cross; not played: empty 2px ring at 40% opacity |

**Behaviour.** Picking a case selects it, as before. When the selected case is out of view, only the list scrolls to it; the page never moves. Status uses the latest result per case (`lastResult`).

**Wiring in `src/App.tsx`:**

```tsx
<aside className="space-y-4">
  <CaseDeck cases={cases} selected={selectedId} lastResult={lastResult} onSelect={setSelectedId} />
  {/* learning log card, section 8 */}
</aside>
```

**`src/components/CaseDeck.tsx` (new):**

```tsx
import { useEffect, useRef } from 'react'
import type { LogEntry, ScenarioIndexEntry } from '../types'
import Mark from './Mark'

interface Props {
  cases: ScenarioIndexEntry[]
  selected: string | null
  lastResult: Record<string, LogEntry>
  onSelect: (id: string) => void
}

/** Dark stacked deck of cases that slides vertically: about four show at once, the rest scroll into view. */
export default function CaseDeck({ cases, selected, lastResult, onSelect }: Props) {
  const list = useRef<HTMLUListElement>(null)
  const done = cases.filter((c) => lastResult[c.id]).length

  // Keep the selected case in view by scrolling the list only, never the page.
  useEffect(() => {
    const ul = list.current
    const li = ul?.querySelector<HTMLElement>('[aria-current="true"]')?.parentElement
    if (!ul || !li) return
    const top = li.offsetTop - ul.offsetTop // both measured from the deck card
    if (top < ul.scrollTop || top + li.offsetHeight > ul.scrollTop + ul.clientHeight) ul.scrollTo({ top, behavior: 'smooth' })
  }, [selected])

  return (
    <div className="relative pt-5">
      {/* the cards behind */}
      <div className="absolute inset-x-8 top-0 h-10 rounded-t-2xl bg-slate-400" aria-hidden="true" />
      <div className="absolute inset-x-4 top-2.5 h-10 rounded-t-2xl bg-slate-600" aria-hidden="true" />

      <div className="relative rounded-2xl bg-deck p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="text-2xl font-bold">Cases</div>
          <span className="rounded-full bg-white/15 px-3 py-0.5 text-base font-semibold tabular-nums">
            {done}/{cases.length}
          </span>
        </div>

        <ul ref={list} className="deck-scroll -mr-2 mt-3 max-h-[23rem] snap-y snap-mandatory space-y-1 overflow-y-auto overscroll-contain pr-2">
          {cases.map((c) => {
            const res = lastResult[c.id]
            const active = c.id === selected
            return (
              <li key={c.id} className="snap-start">
                <button
                  onClick={() => onSelect(c.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-white text-navy' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold leading-snug">{c.title}</span>
                    <span className={`text-sm ${active ? 'text-teal' : 'text-white/70'}`}>Week {c.week}</span>
                  </span>
                  <Status res={res} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Status({ res }: { res?: LogEntry }) {
  if (!res)
    return <span className="h-8 w-8 shrink-0 rounded-full border-2 border-current opacity-40" aria-label="not played" />
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-base text-white ${res.correct ? 'bg-accent-bright' : 'bg-rose-600'}`}
      aria-label={res.correct ? 'correct' : 'wrong'}
    >
      <Mark kind={res.correct ? 'check' : 'cross'} />
    </span>
  )
}
```

## Learning log and case facts

**Learning log.** A solid forest-green card under the deck, with one block per case showing its first-try result. Same card in every week.

| Part | Spec |
| --- | --- |
| Card | `rounded-2xl bg-navy-2 p-5 text-white` |
| Label | "Learning log" `text-base font-bold text-white` |
| Score | `mt-1 text-6xl font-extrabold tracking-tight text-white`; "/6" `text-3xl text-white/70` |
| Result blocks | row `my-3 flex gap-1.5`, one per case: `h-7 flex-1 rounded-md`; not played `bg-white/15`; correct `bg-accent-bright` + white `Mark` check; wrong `bg-rose-600` + white `Mark` cross. Source: `firstTry[caseId]` |
| Lines | "Week 1: correct on first try…" and "Reasoning detail…" `text-base text-white` |
| Footer | "N decisions logged" and "reset" `text-sm text-white/80`, reset `underline hover:text-white` |

```tsx
<div className="my-3 flex gap-1.5" aria-hidden="true">
  {cases.map((c) => {
    const r = firstTry[c.id]
    return (
      <span key={c.id} className={`grid h-7 flex-1 place-items-center rounded-md text-sm ${!r ? 'bg-white/15' : r.correct ? 'bg-accent-bright text-white' : 'bg-rose-600 text-white'}`}>
        {r && <Mark kind={r.correct ? 'check' : 'cross'} />}
      </span>
    )
  })}
</div>
```

**Case facts card (`src/components/CaseFacts.tsx`, all weeks).** `card p-7`.

| Part | Spec |
| --- | --- |
| Title (h2) | `text-4xl font-extrabold tracking-tight text-navy` |
| "Synthetic data" chip | `rounded-full bg-teal-soft px-3 py-1 text-base font-medium text-teal`; title row `flex flex-wrap items-center gap-3` |
| Meta line | `mt-1 text-lg text-slate-700` |
| Decision date | label `card-title`; value `text-xl font-bold text-navy`; left-aligned under the meta line |
| Briefing | `mt-4 text-lg leading-relaxed text-slate-800` |
| Fact tiles | `rounded-xl bg-slate-50 p-4`; label `card-title mb-1`; value `text-xl font-bold whitespace-nowrap text-navy`; unit `text-base font-medium text-slate-500`; sub-line `text-sm text-slate-600` |
| Tile grids | row 1 `mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4`; row 2 `mt-3 … lg:grid-cols-5` |
| Age bar | track `mt-2 h-2 rounded-full bg-slate-200`; fill `bg-accent-bright`, `bg-navy` when past design life |
| Alarms | label `card-title mb-2 text-base`; row `flex gap-4 rounded-lg bg-amber-50 px-4 py-2.5 text-base`; timestamp `shrink-0 font-medium text-amber-700` (no monospace); text `text-slate-800` |

**Turbine figure.** A drawn turbine sits to the right of the title and briefing, from 1024px up. The case's component is lit green inside the nacelle: the generator block when the component name contains "generator", the gearbox block otherwise. The blades turn once every 14 seconds (off when the visitor prefers reduced motion). The caption repeats the component name.

Layout change: wrap the header and briefing in `<div className="grid items-center gap-6 lg:grid-cols-[1fr_15rem]">` and put `<TurbineFigure component={s.component} />` after the briefing, inside that grid. The decision-date wrapper loses `text-right`.

```tsx
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
```

## Charts

All three chart cards (`src/components/Charts.tsx`) get the colours from section 4, bigger titles, 14px axis ticks and thicker lines. A daily gap heat strip sits above the gap chart.

| Part | Before | After |
| --- | --- | --- |
| Chart titles (h3) | `card-title` | `text-xl font-bold text-navy`; "Operating conditions" adds `mb-3` |
| Chart subtitles | `text-sm text-slate-500` | `mt-0.5 text-base text-slate-700` |
| Legends | `text-xs text-slate-600`, 2px swatch line | `text-sm text-slate-700`, 2.5px swatch line |
| "show hourly values" | `text-xs text-slate-500` | `text-sm text-slate-600` |
| Axis ticks | `fontSize: 11` | `fontSize: 14` |
| Tooltip | radius 12, 12px | radius 8, 15px, `fontFamily: 'inherit'`, border `#dcdfdd`, shadow `0 4px 16px rgba(14,42,28,.08)` |
| Temperature chart height | 260px | 300px |
| Gap chart height | 180px | 210px |
| Conditions rows | 72 / 92px | 84 / 108px (last row) |
| Measured line | 2px | 3px |
| Expected line | 1.5px dashed | 2px dashed 5/4 |
| Gap line | 2px | 3px (still switches to `gapHigh` above +2 °C) |
| Conditions lines | 1.5px | 2px |
| "normal range" label | 10px, green | 14px, `C.ink` |
| Conditions label column | `w-24 text-xs` | `w-32 text-sm text-slate-700`; name `font-bold text-navy`; dot `h-2.5 w-2.5` |
| Tip box (when readingHelp is on) | `bg-accent-soft px-3 py-2 text-sm` | `mt-3 rounded-lg bg-slate-50 px-4 py-2.5 text-base text-slate-800` |
| Footnote ("Dashed line = …") | `text-xs text-slate-400` | `mt-2 text-sm text-slate-600` |

In the `FutureShade` component, replace the hard-coded `#0f1e36` with `C.ink`; the zero line and tooltip cursor use `C.expected`.

**Daily gap heat strip.** A row of 21 blocks, one per day of history, placed between the gap chart's header and the chart itself. Each block shows that day's 24 h average gap (`gap_24h` at the last hour of the day). Before the decision it shows history only; after the reveal it adds the later days at 60% opacity, so it never gives the answer away. Hovering a block shows "06.04.: +0.4 °C".

| Daily gap | Colour |
| --- | --- |
| 0 to 0.5 °C (either sign) | #d4ebdb |
| 0.5 to 1 °C | #a6d6b4 |
| 1 to 1.5 °C | #62b47d |
| 1.5 to 2 °C | #2f8f4e |
| above +2 to +4 °C | #d98a3a (amber) |
| above +4 °C | #b3363c (`gapHigh`) |
| below −2 °C | #2b6f80 (teal-blue) |

Wiring: render `<DayStrip s={s} revealed={revealed} />` inside `GapChart`, just before `<ResponsiveContainer … height={210}>`. No new prop is needed.

```tsx
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
```

## Decision panel, reveal and senior chat

These apply to all weeks. Layout and copy are unchanged; only classes and icons change.

**Decision panel (`src/components/DecisionPanel.tsx`).**

| Part | Classes |
| --- | --- |
| Card | `card p-7` (white) |
| "Your call" (h3) | `text-3xl font-extrabold tracking-tight text-navy` |
| Intro line | `mt-1 text-lg text-slate-700` |
| Answer card | `rounded-xl border-2 p-5 text-left transition-colors`; idle `border-transparent bg-slate-50 hover:border-slate-300`; selected `border-accent bg-accent-soft` |
| Answer icon | plain 32px stroke icon, no tinted square: `text-teal`, `text-accent` when selected |
| Answer title / detail | `mt-3 text-xl font-bold text-navy` / `mt-1 text-base text-slate-700` |
| Reason label | `text-lg font-bold text-navy` |
| Textarea | `mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20` |
| Character hint | `text-base text-slate-600` |
| "Lock in decision & reveal" | `rounded-lg bg-accent px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-accent-ink active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40` |

The icon component now returns the SVG alone:

```tsx
function Icon({ id, on }: { id: Answer; on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" className={on ? 'text-accent' : 'text-teal'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[id]} />
    </svg>
  )
}
```

**Reveal (`src/components/Reveal.tsx`).**

| Part | Classes |
| --- | --- |
| Banner | `px-7 py-5 text-white`, `bg-accent` when right, `bg-rose-700` when wrong |
| Banner title | `flex items-center gap-2 text-3xl font-extrabold tracking-tight`, `<Mark kind="check" />` or `"cross"` before "Right call" / "Not the right call" (no text glyph) |
| Banner line | `mt-1 text-lg text-white` |
| Body grid | `grid gap-8 p-7 lg:grid-cols-2` |
| Section labels | `card-title mb-1 text-base` |
| Paragraphs | `text-lg leading-relaxed text-slate-800` |
| Your reasoning quote | `rounded-lg bg-slate-50 p-3 text-base italic text-slate-800` |
| Checks list | `grid gap-x-4 gap-y-1 text-base sm:grid-cols-2`; each item `flex items-center gap-1.5 rounded-md px-2 py-1` with `<Mark>`; met `bg-accent-soft font-medium text-accent-ink`, missed `text-slate-500` |
| Cost table | `w-full text-lg`; best value `font-bold text-accent-ink`, others `text-slate-800`; no monospace |
| "you" chip | `ml-2 rounded-full bg-teal-soft px-2.5 py-0.5 text-sm font-medium text-teal` |
| "best" chip | `ml-2 rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-medium text-accent-ink` |
| Footnotes | `text-sm text-slate-600` |

**Senior chat (`src/components/SeniorChat.tsx`).**

| Part | Classes |
| --- | --- |
| Card | `card p-7` |
| Avatar "SK" | `grid h-12 w-12 shrink-0 place-items-center rounded-full bg-teal text-base font-bold text-white` |
| Name | `text-xl font-bold text-navy` |
| Subline | `text-sm text-slate-600` |
| Sandra's bubble | `max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-lg leading-relaxed bg-slate-50 text-slate-800` |
| User's bubble | same, `ml-auto bg-teal text-white` |
| "Sandra is thinking…" | `w-fit rounded-xl bg-slate-50 px-4 py-3 text-lg text-slate-600` |
| Input | `min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20` |
| "Ask" button | `rounded-lg bg-accent px-6 text-lg font-bold text-white transition-colors hover:bg-accent-ink active:translate-y-px disabled:opacity-40` |

The error message drops its emoji: `` `Could not reach the senior (${msg}). Try asking again in a moment.` ``

## Week 4 reuse map

Week 4 keeps its one-screen layout. The changes: rem-based column widths so they grow with the text, a larger page heading, no text under 13.5px, a new map colour set where all five legend groups are distinct, and no violet anywhere.

**Frame (`ReuseApp.tsx`).**

| Part | Before | After |
| --- | --- | --- |
| Frame | `h-[calc(100vh-5.5rem)] max-w-[1800px] px-4 py-3` | `h-[calc(100vh-6.5rem)] max-w-[1900px] px-8 py-3` |
| Columns | `grid-cols-[280px_minmax(0,1fr)_380px] gap-3` | `grid-cols-[17rem_minmax(0,1fr)_22rem] gap-4` |
| "Reuse Matching Map" (h2) | `text-lg font-semibold` | `text-2xl font-extrabold tracking-tight text-navy` |
| Description | `text-sm text-slate-500` | `text-base text-slate-700` |
| Pseudo-data pill | `text-[11px] … ring-1 ring-amber-200` | `rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800` |
| Error box | `border-l-4 border-rose-400` | `card m-6 border-rose-100 bg-rose-50 p-4 text-sm text-rose-700` |
| Map frame (`ReuseMap.tsx`) | `rounded-2xl ring-1 ring-slate-200` | `rounded-xl border border-slate-200` |

**Map colours (`src/reuse/ui.ts`).**

| Marker group | Shape | Before | After |
| --- | --- | --- | --- |
| Alpiq wind farm | circle | #2a78d6 | #2b6f80 teal-blue |
| Storage hub | square | #d97706 | #a8660c amber |
| Construction / infrastructure / open call / street furniture | diamond | #16a34a | #2f8f4e green |
| Other wind farm | diamond | #7c3aed violet | #2e3431 dark ink |
| Factory / recycler / co-processing | diamond | #64748b | #9aa39e light grey |

```ts
export const ROUTE_COLORS = ['#1f7a4d', '#0d7a7f', '#2f9e8f', '#1f5f7a', '#a8660c', '#6b7a3a']
```

In `ReuseMap.tsx`: selected-marker outline and leg-1 dashed line `#0f1e36` → `#0f3d2e`; unused routes `#94a3b8` → `#8a9a94`. The flagged-farm orange ring (#f97316) is unchanged.

**Text and controls.**

- Every `text-[10px]` and `text-[11px]` in `FarmList.tsx`, `PlanPanel.tsx`, `MapCard.tsx` and `ReuseMap.tsx` becomes `text-xs`.
- Uppercase removed: `PlanPanel` metric labels (`text-[10px] uppercase tracking-wide` → `text-xs text-slate-500`), check source tags (→ `text-xs text-slate-500`), the `MapCard` "pseudo" tag.
- Range sliders: `accent-[#2a78d6]` → `accent-accent`.
- `FarmList`: farm dot and passport bar `bg-teal`; flagged text `text-orange-600` → `text-orange-700` (contrast 3.6:1 → above 4.5:1); open farm row `border border-slate-200 bg-slate-50` (closed rows `border border-transparent`) instead of a ring; "signed" uses `<Mark kind="check" />`.
- `PlanPanel`: plan checks use `<Mark kind={c.ok ? 'check' : c.blocking ? 'cross' : 'warn'} className="mt-0.5" />`; "signed" and "Proposed" use `<Mark kind="check" className="mr-1 align-[-0.125em]" />`; the segmented control's active option loses its `shadow`.
- `MapCard`: floating card corner `rounded-2xl` → `rounded-xl` (its `shadow-xl` stays: it floats over the map).

## Verification and known limits

After applying, check each item at a 1440px-wide window on the production build (`npm run build && npm run preview`).

- [ ] `npx tsc --noEmit` and `npm run build` pass.
- [ ] DevTools shows DM Sans loading from `/fonts/` (no network request to Google Fonts); the demo works offline.
- [ ] Header, every week: "Onboarding to Ownership" and the four week tabs fit on one row; the header is the same grey as the page.
- [ ] Case deck, weeks 1 to 3: about four cases visible; wheel scrolling slides the rest in and each case snaps; picking a case scrolls only the list, never the page.
- [ ] After a right answer: green tick in the deck, green block in the learning log, green "Right call" banner. After a wrong one: red cross, red block, red banner.
- [ ] Turbine figure lights the gearbox on gearbox cases and the generator on generator cases (T09, T01).
- [ ] Daily gap strip shows 21 blocks before the decision and more, faded, after the reveal.
- [ ] Weeks 2 and 3 show the same deck, green learning log card, turbine figure and daily gap strip as week 1; week 3 still shows "coming soon" in the main area.
- [ ] Week 4: five legend groups in five distinct colours; no violet; no text under 13.5px except the km labels on route lines.
- [ ] No ✓ ✗ ✔ ✖ ⚠️ characters left in `src/` (`grep -rn "[✓✗✔✖⚠]" src`).
- [ ] Scores, the senior's answers and the `#/map?…` links behave as before.
- [ ] Every visible heading, label and sentence matches the target repo, except the approved text changes in section 1; anything else was approved before it changed.

**Known limits**

- Desktop only. At phone width (390px) the answer cards' text wraps past two lines and an alarm line touches the right edge; at tablet width (768px) the Week 4 map scrolls sideways by 6px. These were left on purpose.
- The page title is 50px, larger than usual for an app screen, on purpose for the pitch.
- Two labels are new text: "Daily gap" and the deck's done count ("2/6").
- Wrong answers show a red cross, not a green tick, so a miss is visible at a glance.

**Open questions**

- Rename the browser tab `<title>` from "Turbine Judgement Gym" to "Onboarding to Ownership"?
- Any text change not in the approved list in section 1: ask before making it.
