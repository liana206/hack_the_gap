# Scenario data pipeline

The app reads plain JSON files from `public/scenarios/`. Any script that writes this format works
without app changes.

```
public/scenarios/index.json        # [{ "id", "week", "title" }, ...]  (list order = case list order)
public/scenarios/<id>.json         # one file per case, format below
```

- `make_mock_scenarios.py` – 12 synthetic cases, 6 each for Weeks 1 and 2 (no packages, deterministic). Run from repo root:
  `python3 pipeline/make_mock_scenarios.py`

## Scenario format

```jsonc
{
  "id": "w1-gearbox",               // = file name without .json
  "week": 1,                         // case shows up in this week only
  "title": "T03 - gearbox running warm",
  "source": "synthetic",             // always "synthetic" (shown as a label in the UI)
  "turbine": { "name": "T03", "farm": "Training Farm (synthetic)", "age_years": 9,
               "design_life_years": 20, "rated_kw": 2050 },
  "component": "Gearbox bearing (high-speed shaft)",
  "decision_date": "2025-10-26T23:00:00Z",   // = series.t[history_len - 1]
  "briefing": "Short story the junior reads first.",
  "alarms": [{ "t": "2025-10-20T06:00:00Z", "text": "WARNING: ..." }],  // may include hidden-period alarms
  "costs": { "maintenance_eur": 25000, "dismantle_eur": 90000, "downtime_per_day_eur": 1200 },
  "series": {
    "t": ["2025-10-06T00:00:00Z", "..."],   // ISO UTC, hourly
    "history_len": 504,                       // indices < history_len are VISIBLE before the decision
    "component_temp":     [/* °C, measured */],
    "component_expected": [/* °C, what a healthy part would show */],
    "gap_24h":            [/* °C, 24 h trailing mean of measured - expected (gap chart) */],
    "power_kw":           [/* kW */],
    "wind_ms":            [/* m/s */],
    "ambient_c":          [/* °C outside */]
  },
  "truth": {                                  // hidden until the junior commits
    "answer": "maintenance",                  // "ok" | "maintenance" | "dismantle"
    "outcome": "What actually happened after the decision date.",
    "explanation": "Which signal in the data showed it, in plain words.",
    "cost_if": { "ok": 420000, "maintenance": 27400, "dismantle": 1300000 }  // illustrative EUR
  }
}
```

Rules:
- All `series` arrays have the same length as `t`. Use numbers only (no `null`): fill short gaps
  (forward-fill or interpolate) and pick windows without long outages.
- Cases use 21 days visible + 14 days hidden (`history_len` = 504 of 840 points). Other lengths
  work, but keep it around 3–6 weeks so charts stay readable.
- The app scores `decision === truth.answer` in code. The LLM never decides correctness.
- The senior gets a text summary computed from `series` (gap measured vs expected, trend, alarms),
  never the raw arrays.

## Adding a new case

All cases are synthetic, designed so each one teaches one lesson. To add one:

1. In `make_mock_scenarios.py`, copy a scenario function (e.g. `gearbox()`) and give it a new
   `id`, `title`, `week` and seed (`random.Random(<new number>)`).
2. Shape the story with the `build(...)` arguments:
   - `fault_gap(i)` – extra °C on top of expected at hour `i` (0 = healthy). A slowly growing
     gap is a developing fault; keep it small in the visible part so it is a real judgement call.
   - `stop_at` – hour index where the turbine trips (power 0, temperature falls).
   - `ambient_base`, `ambient_bump(i)`, `wind_mean` – weather (heatwave, calm week, storm …).
   - Hour `HISTORY_LEN` (= 504) is the decision date; everything after is hidden until the reveal.
3. Write `briefing`, `alarms`, `costs` and the `truth` (`answer`, `outcome`, `explanation`,
   `cost_if`). Make sure the cheapest `cost_if` is the right `answer`.
4. Add the function to the `scenarios` list in `main()` and run
   `python3 pipeline/make_mock_scenarios.py`. It rewrites all files and `index.json`.
5. Check the case in the app: is the lesson visible in the history, but not obvious?

Week 2 cases also have `"challenge": { "stance": "ok", "text": "...", "points": ["..."] }`: what Sandra argues before the reveal,
and the separate arguments the junior must answer in the debate if they go against her.
It is scripted, so no LLM needs the truth. If `stance` differs from `truth.answer`, the case is a wrong-AI trap.

Ideas for later weeks: a case where the timing of maintenance
matters (week 3, add price data), an end-of-life case with part resale values (week 4).
