# Scenario data pipeline

The app reads plain JSON files from `public/scenarios/`. It never knows whether they are
mock or real, so **any script that writes this format works without app changes**.

```
public/scenarios/index.json        # [{ "id", "week", "title" }, ...]  (list order = case list order)
public/scenarios/<id>.json         # one file per case, format below
```

- `make_mock_scenarios.py` – 4 synthetic Week 1 cases (no packages, deterministic). Run from repo root:
  `python3 pipeline/make_mock_scenarios.py`
- `make_real_scenarios.py` – **TODO (P1)**: same output from the CARE to Compare dataset.

## Scenario format

```jsonc
{
  "id": "w1-gearbox",               // = file name without .json
  "week": 1,                         // case shows up from this week on
  "title": "T03 - gearbox running warm",
  "source": "synthetic",             // "synthetic" | "care"
  "turbine": { "name": "T03", "farm": "Wind Farm A", "age_years": 9,
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
- Mock uses 21 days visible + 14 days hidden (`history_len` = 504 of 840 points). Real cases may
  differ, but keep it around 3–6 weeks so charts stay readable.
- The app scores `decision === truth.answer` in code. The LLM never decides correctness.
- The senior gets a text summary computed from `series` (gap measured vs expected, trend, alarms),
  never the raw arrays.

## Notes for `make_real_scenarios.py` (CARE to Compare, Wind Farm A)

Dataset: CARE to Compare, Zenodo record **14006163**. Wind Farm A = 5 onshore turbines (Portugal,
EDP open data), 10-minute SCADA, one CSV per event in `Wind Farm A/datasets/<event_id>.csv`,
plus `Wind Farm A/event_info.csv` and `Wind Farm A/feature_description.csv`.

Suggested steps (file and column names from memory of the dataset docs: check them against the download):
1. Read `event_info.csv`: each row is an event with `event_label` (`anomaly` / `normal`),
   `event_start`, `event_end`, `asset_id` and a text `event_description` (the fault).
2. Pick events where the fault is a temperature-visible component (gearbox / generator bearing,
   transformer, hydraulic …). Use `feature_description.csv` to find the matching sensor column
   (e.g. a gearbox/generator bearing temperature `sensor_XX_avg`), plus power, wind speed and
   ambient temperature columns.
3. Resample 10-min → hourly mean. Choose the decision date some days **before** `event_start`
   for anomaly events (the junior should be able to see early signs), any date for normal events.
   Visible = window before decision date, hidden = up to ~14 days after.
4. `component_expected`: fit a simple linear model `temp ~ a + b*power + c*ambient` on the
   training part of the same turbine (the CSVs have a `train_test` column; use `train`
   rows with `status_type_id` normal). Write the fitted values for the whole window. The mock
   uses `32 + 0.011*power_kw + 0.85*ambient_c` as a stand-in.
5. `truth.answer`: anomaly events → `"maintenance"`; normal events → `"ok"`. `"dismantle"` is
   a business call (age + repowering plan + costs), so set it by hand in the briefing/costs.
   `outcome` / `explanation` from `event_description`, written in plain language.
6. Ages, costs and `cost_if` are not in the dataset: set them by hand (illustrative) and keep
   `"source": "care"` so the UI labels the case as real data.
7. Write the files and append entries to `index.json` (use `week` to control when cases appear).
