#!/usr/bin/env python3
"""Generate 4 synthetic Week 1 scenarios into public/scenarios/.

Pure Python, no packages. Deterministic (fixed seeds), so re-running gives the same files.
Format: see pipeline/README.md. Run from the repo root:  python3 pipeline/make_mock_scenarios.py
"""
import json
import math
import random
from datetime import datetime, timedelta
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "scenarios"
VISIBLE_DAYS, HIDDEN_DAYS = 21, 14
HOURS = (VISIBLE_DAYS + HIDDEN_DAYS) * 24
HISTORY_LEN = VISIBLE_DAYS * 24
RATED_KW = 2050


def expected_temp(power_kw, ambient_c):
    """The 'normal behaviour' model the app compares against."""
    return 32 + 0.011 * power_kw + 0.85 * ambient_c


def power_curve(v):
    if v < 3 or v > 25:
        return 0.0
    if v >= 12:
        return float(RATED_KW)
    return RATED_KW * ((v - 3) / 9) ** 3


def weather(rng, start, ambient_base, ambient_bump=None, wind_mean=8.0):
    """Hourly wind (AR(1) around wind_mean m/s) and ambient temperature (daily cycle + noise).
    ambient_bump(hour_index) -> extra degrees, used for the heatwave."""
    wind, ambient = [], []
    v = wind_mean
    for i in range(HOURS):
        v = wind_mean + 0.93 * (v - wind_mean) + rng.gauss(0, 0.9)
        v = max(0.0, v)
        hour = (start + timedelta(hours=i)).hour
        a = ambient_base + 5 * math.sin((hour - 9) / 24 * 2 * math.pi) + rng.gauss(0, 0.6)
        if ambient_bump:
            a += ambient_bump(i)
        wind.append(round(v, 2))
        ambient.append(round(a, 1))
    return wind, ambient


def build(rng, start, ambient_base, fault_gap=lambda i: 0.0, stop_at=None, ambient_bump=None,
          wind_mean=8.0):
    """Build all series. fault_gap(i) = extra °C on top of expected (a developing fault).
    stop_at = hour index where the turbine trips and stops producing."""
    wind, ambient = weather(rng, start, ambient_base, ambient_bump, wind_mean)
    temp, exp, power = [], [], []
    measured = None
    for i in range(HOURS):
        p = power_curve(wind[i]) * rng.uniform(0.96, 1.0)
        if stop_at is not None and i >= stop_at:
            p = 0.0
        e = expected_temp(p, ambient[i])
        target = e + fault_gap(i)
        if stop_at is not None and i >= stop_at:
            target = ambient[i] + 8  # stopped machine cools down towards ambient
        # thermal inertia: measured follows its target with a lag
        measured = target if measured is None else measured + 0.35 * (target - measured)
        temp.append(round(measured + rng.gauss(0, 0.5), 1))
        exp.append(round(e, 1))
        power.append(round(p, 0))
    t = [(start + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(HOURS)]
    return {
        "t": t,
        "history_len": HISTORY_LEN,
        "component_temp": temp,
        "component_expected": exp,
        "power_kw": power,
        "wind_ms": wind,
        "ambient_c": ambient,
    }


def ts(start, hour_index):
    return (start + timedelta(hours=hour_index)).strftime("%Y-%m-%dT%H:%M:%SZ")


def decision_date(start):
    return ts(start, HISTORY_LEN - 1)


def turbine(name, age):
    return {"name": name, "farm": "Wind Farm A (synthetic)", "age_years": age,
            "design_life_years": 20, "rated_kw": RATED_KW}


# ---------------------------------------------------------------- scenarios

def healthy():
    rng = random.Random(1)
    start = datetime(2025, 4, 1)
    return {
        "id": "w1-healthy", "week": 1, "title": "T07 - routine check", "source": "synthetic",
        "turbine": turbine("T07", 6), "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": "Monthly routine review of T07. The operator noticed a short communication "
                    "alarm last week and asks whether anything needs to be done.",
        "alarms": [{"t": ts(start, 300), "text": "INFO: SCADA communication lost for 2 min, restored"}],
        "costs": {"maintenance_eur": 25000, "dismantle_eur": 90000, "downtime_per_day_eur": 1200},
        "series": build(rng, start, ambient_base=13),
        "truth": {
            "answer": "ok",
            "outcome": "T07 kept running normally for the next two weeks. No fault was found at the "
                       "next scheduled service.",
            "explanation": "Measured bearing temperature stayed on top of the expected curve the whole "
                           "time. The only alarm was a communication blip, not a machine problem.",
            "cost_if": {"ok": 0, "maintenance": 27400, "dismantle": 1500000},
        },
    }


def gearbox():
    rng = random.Random(2)
    start = datetime(2025, 10, 6)
    onset, fail = 6 * 24, HISTORY_LEN + 12 * 24

    def gap(i):
        if i < onset:
            return 0.0
        d = (i - onset) / 24  # days since onset
        return 0.25 * d + 0.004 * d ** 2.4  # slow creep that accelerates

    return {
        "id": "w1-gearbox", "week": 1, "title": "T03 - gearbox running warm", "source": "synthetic",
        "turbine": turbine("T03", 9), "component": "Gearbox bearing (high-speed shaft)",
        "decision_date": decision_date(start),
        "briefing": "T03 produces normally and has no active alarms. The data team flagged it in an "
                    "automatic weekly report. Decide whether to send a maintenance crew.",
        "alarms": [],
        "costs": {"maintenance_eur": 25000, "dismantle_eur": 90000, "downtime_per_day_eur": 1200},
        "series": build(rng, start, ambient_base=12, fault_gap=gap, stop_at=fail),
        "truth": {
            "answer": "maintenance",
            "outcome": "12 days after the decision date the high-speed bearing seized. T03 tripped and "
                       "the gearbox had to be replaced with a crane (8 weeks offline).",
            "explanation": "Measured temperature slowly pulled away from the expected curve, a few "
                           "degrees more every day, while power and weather were normal. A growing gap "
                           "at normal load is the classic early sign of a bearing fault.",
            "cost_if": {"ok": 420000, "maintenance": 27400, "dismantle": 1300000},
        },
    }


def heatwave():
    rng = random.Random(3)
    start = datetime(2025, 7, 1)

    def bump(i):
        # heatwave over the last 7 visible days, fading in the hidden period
        d = i / 24
        if 13 <= d < 21:
            return 9 * min(1.0, (d - 13) / 2)
        if 21 <= d < 25:
            return 9 * (1 - (d - 21) / 4)
        return 0.0

    series = build(rng, start, ambient_base=25, ambient_bump=bump, wind_mean=9.5)
    # bait alarm: first hot hour of each day where the bearing crossed 80 °C
    alarms, days = [], set()
    for i, temp in enumerate(series["component_temp"][:HISTORY_LEN]):
        if temp > 80 and i // 24 not in days:
            days.add(i // 24)
            alarms.append({"t": ts(start, i), "text": "WARNING: gearbox bearing temperature > 80 °C"})

    return {
        "id": "w1-heatwave", "week": 1, "title": "T11 - heatwave warning", "source": "synthetic",
        "turbine": turbine("T11", 8), "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": "A heatwave hit the region this week. T11 raised a temperature warning and the "
                    "site manager asks if a crew should go out.",
        "alarms": alarms,
        "costs": {"maintenance_eur": 25000, "dismantle_eur": 90000, "downtime_per_day_eur": 1200},
        "series": series,
        "truth": {
            "answer": "ok",
            "outcome": "The heatwave ended four days later and temperatures went back to normal. "
                       "No fault was ever found.",
            "explanation": "The temperature was high, but it was exactly as high as expected for that "
                           "power and outside temperature. The gap between measured and expected stayed "
                           "near zero, so the warning was the weather, not the bearing.",
            "cost_if": {"ok": 0, "maintenance": 27400, "dismantle": 1400000},
        },
    }


def old_generator():
    rng = random.Random(4)
    start = datetime(2025, 2, 3)
    onset = 4 * 24

    def gap(i):
        if i < onset:
            return 0.0
        d = (i - onset) / 24
        return 0.4 * d + 0.006 * d ** 2.5

    return {
        "id": "w1-old-generator", "week": 1, "title": "T01 - old generator", "source": "synthetic",
        "turbine": turbine("T01", 23), "component": "Generator bearing (drive end)",
        "decision_date": decision_date(start),
        "briefing": "T01 is one of the first turbines of the farm (23 years old). The whole site is "
                    "planned for repowering with new turbines in 18 months. The generator bearing "
                    "temperature is rising. Repair quote: 180k EUR (generator overhaul). "
                    "Dismantling now: 60k EUR, and parts can be sold.",
        "alarms": [{"t": ts(start, 18 * 24 + 6), "text": "WARNING: generator bearing temperature trend high"}],
        "costs": {"maintenance_eur": 180000, "dismantle_eur": 60000, "downtime_per_day_eur": 700},
        "series": build(rng, start, ambient_base=6, fault_gap=gap, stop_at=HISTORY_LEN + 9 * 24),
        "truth": {
            "answer": "dismantle",
            "outcome": "The bearing failed 9 days later. Because repowering was close, the owner "
                       "dismantled T01 and sold the gearbox and blades as spare parts.",
            "explanation": "The fault was real (the gap kept growing), but the turbine was 3 years past "
                           "its design life and would be replaced in 18 months anyway. A 180k repair "
                           "cannot be earned back in 18 months by an old 2 MW turbine; dismantling "
                           "early and selling parts was cheapest.",
            "cost_if": {"ok": 140000, "maintenance": 195000, "dismantle": 45000},
        },
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    scenarios = [healthy(), gearbox(), heatwave(), old_generator()]
    for s in scenarios:
        (OUT / f"{s['id']}.json").write_text(json.dumps(s, separators=(",", ":")))
    index = [{"id": s["id"], "week": s["week"], "title": s["title"]} for s in scenarios]
    (OUT / "index.json").write_text(json.dumps(index, indent=2))
    print(f"wrote {len(scenarios)} scenarios to {OUT}")


if __name__ == "__main__":
    main()
