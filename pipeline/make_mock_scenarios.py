#!/usr/bin/env python3
"""Generate synthetic Week 1 scenarios into public/scenarios/.

Pure Python, no packages. Deterministic (fixed seeds), so re-running gives the same files.
Format: see pipeline/README.md. Run from the repo root:  python3 pipeline/make_mock_scenarios.py

Turbine age matters in three places:
  1. Temperature: older gearboxes/generators run a bit warmer and noisier, so the expected curve
     includes an age offset (an old turbine that is warm is not automatically faulty).
  2. Money: remaining life (until design life + extension, or until repowering) decides how much
     revenue is lost by dismantling; old turbines also produce less and cost more to run.
  3. Warranty: young turbines are under OEM warranty, so planned maintenance is cheap for them.
All cost_if numbers are computed from these rules, and each scenario's answer is checked to be
the cheapest option. Every euro number is illustrative.
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
PRICE_EUR_MWH = 70          # illustrative flat price
DESIGN_LIFE = 20
LIFE_EXTENSION = 5          # years an old turbine may run past design life with extra inspections
WARRANTY_YEARS = 5


# ---------------------------------------------------------------- turbine and age

def turbine(name, age, repowering_in_years=None, last_service_months=6):
    """Static facts about one turbine. Everything age-dependent is derived here."""
    cf = 0.27 if age < 15 else 0.22                      # older turbines: lower availability
    revenue = RATED_KW * cf * 8760 / 1000 * PRICE_EUR_MWH
    om_cost = 30000 + 1500 * age                         # O&M cost per year grows with age
    life_left = max(0.0, DESIGN_LIFE + LIFE_EXTENSION - age)
    if repowering_in_years is not None:
        life_left = min(life_left, repowering_in_years)
    return {
        "name": name, "farm": "Wind Farm A (synthetic)",
        "age_years": age, "commissioned": 2025 - age,
        "design_life_years": DESIGN_LIFE,
        "years_past_design_life": max(0, age - DESIGN_LIFE),
        "remaining_life_years": round(life_left, 1),
        "repowering_in_years": repowering_in_years,
        "under_warranty": age < WARRANTY_YEARS,
        "last_major_service_months_ago": last_service_months,
        "rated_kw": RATED_KW,
        "capacity_factor": cf,
        "annual_margin_eur": round(revenue - om_cost, -3),
    }


def age_label(t):
    s = f"{t['name']}, {t['age_years']} years old (design life {t['design_life_years']})"
    if t["under_warranty"]:
        s += ", still under OEM warranty"
    if t["repowering_in_years"] is not None:
        y = t["repowering_in_years"]
        s += f", site repowering in {y * 12:.0f} months" if y < 1 else f", site repowering in {y:g} years"
    return s


def downtime_per_day(t):
    return round(RATED_KW * t["capacity_factor"] * 24 / 1000 * PRICE_EUR_MWH, -1)


def money_note(t, c):
    """Business facts the junior needs for the call, in one sentence. Uses no outcome data."""
    s = (f"Money: about {t['remaining_life_years']:g} years of life left, earning about "
         f"{t['annual_margin_eur']:,.0f} EUR per year; intact parts would sell for about "
         f"{c['resale_parts_eur']:,} EUR.")
    if t["under_warranty"]:
        s += f" Planned repair is free under warranty (list price {c['maintenance_list_price_eur']:,} EUR)."
    return s


def costs(t, maintenance_eur, dismantle_eur, resale_eur):
    return {"maintenance_eur": 0 if t["under_warranty"] else maintenance_eur,
            "maintenance_list_price_eur": maintenance_eur,
            "dismantle_eur": dismantle_eur,
            "resale_parts_eur": resale_eur,
            "downtime_per_day_eur": downtime_per_day(t)}


def cost_if(t, c, *, fault, maint_days=2, failure_repair_eur=0, failure_offline_days=0,
            failure_ends_life=False, damaged_resale_eur=None):
    """Total cost of each answer given what really happens. Illustrative, but consistent."""
    dd = c["downtime_per_day_eur"]
    lost_life = t["annual_margin_eur"] * t["remaining_life_years"]
    dismantle = c["dismantle_eur"] - c["resale_parts_eur"] + lost_life
    maintenance = c["maintenance_eur"] + maint_days * dd
    if not fault:
        ok = 0
    elif failure_ends_life:   # breaks, then has to be dismantled anyway with damaged parts
        resale = c["resale_parts_eur"] if damaged_resale_eur is None else damaged_resale_eur
        ok = c["dismantle_eur"] - resale + lost_life
    else:
        ok = failure_repair_eur + failure_offline_days * dd
    return {"ok": round(ok, -2), "maintenance": round(maintenance, -2), "dismantle": round(dismantle, -2)}


# ---------------------------------------------------------------- signals

def expected_temp(power_kw, ambient_c, age):
    """The 'normal behaviour' model the app compares against. Older machines run a bit warmer."""
    return 32 + 0.011 * power_kw + 0.85 * ambient_c + 0.25 * age


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


def build(rng, start, age, ambient_base, fault_gap=lambda i: 0.0, stop_at=None, ambient_bump=None,
          wind_mean=8.0):
    """Build all series. fault_gap(i) = extra °C on top of expected (a developing fault).
    stop_at = hour index where the turbine trips and stops producing."""
    wind, ambient = weather(rng, start, ambient_base, ambient_bump, wind_mean)
    noise = 0.5 + 0.02 * age                              # older sensors and parts: noisier
    temp, exp, power, gap = [], [], [], []
    measured = None
    for i in range(HOURS):
        p = power_curve(wind[i]) * rng.uniform(0.96, 1.0)
        if stop_at is not None and i >= stop_at:
            p = 0.0
        e = expected_temp(p, ambient[i], age)
        target = e + fault_gap(i)
        if stop_at is not None and i >= stop_at:
            target = ambient[i] + 8  # stopped machine cools down towards ambient
        # thermal inertia: measured follows its target with a lag
        measured = target if measured is None else measured + 0.35 * (target - measured)
        m = round(measured + rng.gauss(0, noise), 1)
        temp.append(m)
        exp.append(round(e, 1))
        power.append(round(p, 0))
        gap.append(m - e)
    # 24 h rolling mean of measured - expected: what the junior should learn to read
    gap_24h = [round(sum(gap[max(0, i - 23):i + 1]) / len(gap[max(0, i - 23):i + 1]), 2) for i in range(HOURS)]
    t = [(start + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(HOURS)]
    return {
        "t": t,
        "history_len": HISTORY_LEN,
        "component_temp": temp,
        "component_expected": exp,
        "gap_24h": gap_24h,
        "power_kw": power,
        "wind_ms": wind,
        "ambient_c": ambient,
    }


def ts(start, hour_index):
    return (start + timedelta(hours=hour_index)).strftime("%Y-%m-%dT%H:%M:%SZ")


def decision_date(start):
    return ts(start, HISTORY_LEN - 1)


def high_temp_alarms(start, series, limit, text):
    """First hour of each day where the measured temperature crossed `limit` (visible part only)."""
    alarms, days = [], set()
    for i, temp in enumerate(series["component_temp"][:HISTORY_LEN]):
        if temp > limit and i // 24 not in days:
            days.add(i // 24)
            alarms.append({"t": ts(start, i), "text": text})
    return alarms


def signal_note(series):
    """Measured minus expected over the visible history, stated plainly. Visible data only."""
    h = series["history_len"]
    gap = [m - e for m, e in zip(series["component_temp"][:h], series["component_expected"][:h])]
    first, last = sum(gap[:7 * 24]) / (7 * 24), sum(gap[-72:]) / 72
    return (f"Data check: measured minus expected temperature averaged {first:+.1f} °C in the first "
            f"week and {last:+.1f} °C in the last 3 days.")


def creep(onset_day, lin, quad, power_):
    """Fault gap that starts at onset_day and accelerates: lin*d + quad*d**power_ (°C)."""
    onset = onset_day * 24

    def gap(i):
        if i < onset:
            return 0.0
        d = (i - onset) / 24
        return lin * d + quad * d ** power_
    return gap


# ---------------------------------------------------------------- scenarios

def healthy():
    rng = random.Random(1)
    start = datetime(2025, 4, 1)
    t = turbine("T07", 6)
    c = costs(t, 25000, 90000, 150000)
    series = build(rng, start, t["age_years"], ambient_base=13)
    return {
        "id": "w1-healthy", "week": 1, "title": "T07 - routine check", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"Monthly routine review of {age_label(t)}. The operator noticed a short "
                    f"communication alarm last week and asks whether anything needs to be done. "
                    f"{signal_note(series)} {money_note(t, c)}",
        "alarms": [{"t": ts(start, 300), "text": "INFO: SCADA communication lost for 2 min, restored"}],
        "costs": c,
        "series": series,
        "truth": {
            "answer": "ok",
            "outcome": "T07 kept running normally for the next two weeks. No fault was found at the "
                       "next scheduled service.",
            "explanation": "Measured bearing temperature stayed on top of the expected curve the whole "
                           "time. The only alarm was a communication blip, not a machine problem.",
            "cost_if": cost_if(t, c, fault=False),
        },
    }


def gearbox():
    rng = random.Random(2)
    start = datetime(2025, 10, 6)
    t = turbine("T03", 9)
    c = costs(t, 25000, 90000, 150000)
    fail = HISTORY_LEN + 12 * 24
    series = build(rng, start, t["age_years"], ambient_base=12,
                   fault_gap=creep(6, 0.8, 0.01, 2.2), stop_at=fail)
    return {
        "id": "w1-gearbox", "week": 1, "title": "T03 - gearbox running warm", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing (high-speed shaft)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. It produces normally and has no active alarms. The data team "
                    f"flagged it in an automatic weekly report. Decide whether to send a maintenance crew. "
                    f"{signal_note(series)} {money_note(t, c)}",
        "alarms": [],
        "costs": c,
        "series": series,
        "truth": {
            "answer": "maintenance",
            "outcome": "12 days after the decision date the high-speed bearing seized. T03 tripped and "
                       "the gearbox had to be replaced with a crane (8 weeks offline).",
            "explanation": "Measured temperature steadily pulled away from the expected curve, about "
                           "a degree more every day, while power and weather were normal. A growing gap "
                           "at normal load is the classic early sign of a bearing fault. With 16 years of "
                           "life left, a planned bearing swap is far cheaper than a new gearbox.",
            "cost_if": cost_if(t, c, fault=True, failure_repair_eur=380000, failure_offline_days=56),
        },
    }


def heatwave():
    rng = random.Random(3)
    start = datetime(2025, 7, 1)
    t = turbine("T11", 8)
    c = costs(t, 25000, 90000, 150000)

    def bump(i):
        # heatwave over the last 7 visible days, fading in the hidden period
        d = i / 24
        if 13 <= d < 21:
            return 9 * min(1.0, (d - 13) / 2)
        if 21 <= d < 25:
            return 9 * (1 - (d - 21) / 4)
        return 0.0

    series = build(rng, start, t["age_years"], ambient_base=25, ambient_bump=bump, wind_mean=9.5)
    return {
        "id": "w1-heatwave", "week": 1, "title": "T11 - heatwave warning", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"A heatwave hit the region this week. {age_label(t)} raised temperature warnings "
                    f"and the site manager asks if a crew should go out. {signal_note(series)} {money_note(t, c)}",
        "alarms": high_temp_alarms(start, series, 80, "WARNING: gearbox bearing temperature > 80 °C"),
        "costs": c,
        "series": series,
        "truth": {
            "answer": "ok",
            "outcome": "The heatwave ended four days later and temperatures went back to normal. "
                       "No fault was ever found.",
            "explanation": "The temperature was high, but it was exactly as high as expected for that "
                           "power and outside temperature. The gap between measured and expected stayed "
                           "near zero, so the warning was the weather, not the bearing.",
            "cost_if": cost_if(t, c, fault=False),
        },
    }


def old_healthy():
    rng = random.Random(5)
    start = datetime(2025, 5, 12)
    t = turbine("T02", 21, repowering_in_years=3, last_service_months=4)
    c = costs(t, 25000, 60000, 40000)
    series = build(rng, start, t["age_years"], ambient_base=16)
    return {
        "id": "w1-old-healthy", "week": 1, "title": "T02 - old and warm", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. Its gearbox bearing always runs about 5 °C warmer than the "
                    "newer turbines and it is now past its design life. A colleague suggests "
                    f"dismantling it before something breaks. {signal_note(series)} {money_note(t, c)}",
        "alarms": [{"t": ts(start, 14 * 24 + 15),
                    "text": "INFO: gearbox bearing temperature above fleet average"}],
        "costs": c,
        "series": series,
        "truth": {
            "answer": "ok",
            "outcome": "T02 kept running normally. It passed its life-extension inspection two months "
                       "later and will run until the site is repowered.",
            "explanation": "Old gearboxes run warmer; the expected curve already includes that. "
                           "Measured temperature sits right on the expected curve, so nothing is "
                           "getting worse. Warm is not the same as failing, and dismantling would throw "
                           "away three years of revenue.",
            "cost_if": cost_if(t, c, fault=False),
        },
    }


def warranty_generator():
    rng = random.Random(6)
    start = datetime(2025, 9, 1)
    t = turbine("T09", 3)
    c = costs(t, 30000, 90000, 200000)
    fail = HISTORY_LEN + 8 * 24
    series = build(rng, start, t["age_years"], ambient_base=15,
                   fault_gap=creep(13, 1.5, 0.03, 2.2), stop_at=fail)
    return {
        "id": "w1-warranty-generator", "week": 1, "title": "T09 - young turbine, fast fault",
        "source": "synthetic",
        "turbine": t, "component": "Generator bearing (non-drive end)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. The OEM covers bearing repairs, but only for faults reported "
                    "before they cause damage. The generator bearing has been getting warmer for a "
                    f"week. The crew is busy, and it is only a 3-year-old machine. "
                    f"{signal_note(series)} {money_note(t, c)}",
        "alarms": [{"t": ts(start, 19 * 24 + 3), "text": "WARNING: generator bearing temperature trend high"}],
        "costs": c,
        "series": series,
        "truth": {
            "answer": "maintenance",
            "outcome": "The bearing failed 8 days later. Because it had not been reported, the OEM "
                       "refused the warranty claim and the generator had to be rewound at the owner's cost.",
            "explanation": "A young turbine can still fail. The gap grew quickly over one week. Reporting "
                           "it now costs almost nothing under warranty; ignoring it voids the warranty.",
            "cost_if": cost_if(t, c, fault=True, failure_repair_eur=260000, failure_offline_days=35),
        },
    }


def old_generator():
    rng = random.Random(4)
    start = datetime(2025, 2, 3)
    t = turbine("T01", 23, repowering_in_years=0.5, last_service_months=14)
    c = costs(t, 180000, 60000, 40000)
    series = build(rng, start, t["age_years"], ambient_base=6,
                   fault_gap=creep(4, 0.8, 0.005, 2.5), stop_at=HISTORY_LEN + 9 * 24)
    return {
        "id": "w1-old-generator", "week": 1, "title": "T01 - old generator", "source": "synthetic",
        "turbine": t, "component": "Generator bearing (drive end)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. It is one of the first turbines of the farm, and the whole site "
                    "will be repowered with new turbines in 6 months. The generator bearing temperature "
                    "is rising. Repair quote: 180k EUR (generator overhaul). Dismantling now: 60k EUR, "
                    f"and parts can be sold for about 40k EUR. {signal_note(series)} {money_note(t, c)}",
        "alarms": [{"t": ts(start, 18 * 24 + 6), "text": "WARNING: generator bearing temperature trend high"}],
        "costs": c,
        "series": series,
        "truth": {
            "answer": "dismantle",
            "outcome": "The bearing failed 9 days later. Because repowering was close, the owner "
                       "dismantled T01, and the damaged generator could no longer be sold.",
            "explanation": "The fault was real (the gap kept growing), but the turbine was 3 years past "
                           "its design life and would be replaced in 6 months anyway. Six months of an "
                           "old turbine earn less than the 180k repair; dismantling now and selling the "
                           "parts while they are intact is cheapest.",
            "cost_if": cost_if(t, c, fault=True, maint_days=14, failure_ends_life=True, damaged_resale_eur=10000),
        },
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    scenarios = [healthy(), gearbox(), heatwave(), old_healthy(), warranty_generator(), old_generator()]
    for s in scenarios:
        ci = s["truth"]["cost_if"]
        cheapest = min(ci, key=ci.get)
        assert cheapest == s["truth"]["answer"], f"{s['id']}: answer {s['truth']['answer']} but cheapest is {cheapest} {ci}"
        (OUT / f"{s['id']}.json").write_text(json.dumps(s, separators=(",", ":"), ensure_ascii=False),
                                              encoding="utf-8")
    index = [{"id": s["id"], "week": s["week"], "title": s["title"],
              "turbine": s["turbine"]["name"], "age_years": s["turbine"]["age_years"]} for s in scenarios]
    (OUT / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    for s in scenarios:
        t, ci = s["turbine"], s["truth"]["cost_if"]
        print(f"{s['id']:24s} {t['name']} age {t['age_years']:>2}  life left {t['remaining_life_years']:>4}y  "
              f"answer {s['truth']['answer']:11s} cost_if {ci}")
    print(f"wrote {len(scenarios)} scenarios to {OUT}")


if __name__ == "__main__":
    main()
