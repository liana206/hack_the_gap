# Turbine Judgement Gym

Hack the Gap 2026 · Alpiq challenge · Track B "Judgement Gym".

A junior asset manager practises wind turbine maintenance calls on historical SCADA data:
**nothing wrong / call maintenance / dismantle**. From week 2 on they must also explain their reasoning
and debate the senior's challenge, which is sometimes wrong on purpose, until her arguments are answered. Then
the hidden future is revealed, the decision is scored **in code against the real outcome**,
and an AI senior ("Sandra", Gemini) coaches them. A learning log tracks first-try accuracy.

## Run

```bash
npm install
cp .env.example .env                        # add GEMINI_API_KEY (optional: works offline without)
python3 pipeline/make_mock_scenarios.py     # writes public/scenarios/*.json
npm run dev                                 # http://localhost:5173
```

`npm run build` type-checks and builds. `npm run preview` serves the build (also with `/api/gemini`).

Without `GEMINI_API_KEY` the senior gives a built-in offline reply, so the demo never breaks.

## How it fits together

| File | What |
|---|---|
| `src/weeks.ts` | Week 1–4 definitions and feature flags (`thinkFirst`, `strictSenior`, `traps`, `scheduling`, `secondLife`). New weeks = implement flag + `ready: true`. |
| `src/types.ts` | Scenario JSON format, log entry, answer options |
| `src/senior.ts` | Case summary computed in code (never raw arrays), system prompt, Gemini call, offline fallback |
| `src/App.tsx` | Layout, case loading, scoring, localStorage learning log |
| `src/components/` | Week picker, case list, facts, charts, decision cards, reveal, senior chat |
| `vite.config.ts` | Dev-server middleware `/api/gemini`: forwards `{system, messages}` to Gemini; the key stays server-side |
| `pipeline/` | Data generators + [format docs](pipeline/README.md) |

## Oversight & honesty

- The junior decides; the senior only speaks after the decision is locked in (week 1).
- Correctness comes from `truth.answer`, never from the LLM.
- From week 2, the senior must not receive the truth before the reveal (`buildSystemPrompt(..., revealed=false)`).
- All data is synthetic: hand-designed cases that follow realistic fault patterns
  (a bearing fault shows as a growing gap between measured and expected temperature).
  Costs are illustrative, not real Alpiq figures. We chose this over a real dataset so
  every case teaches one clear lesson and the outcome is known.
