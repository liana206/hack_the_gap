#!/usr/bin/env python3
"""Generate synthetic Week 1, 2 and 4 scenarios into public/scenarios/.

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
                    f"communication alarm last week and asks whether anything needs to be done.",
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
        "id": "w1-gearbox", "week": 1, "title": "T03 - weekly data review", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing (high-speed shaft)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. It has no active alarms and is on this week's routine data "
                    f"review list. Decide whether to send a maintenance crew.",
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
                    f"and the site manager asks if a crew should go out.",
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
        "id": "w1-old-healthy", "week": 1, "title": "T02 - past design life", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. It is now past its design life. A colleague says its gearbox "
                    "bearing runs warmer than on the newer turbines and suggests dismantling it "
                    f"before something breaks.",
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
        "id": "w1-warranty-generator", "week": 1, "title": "T09 - generator check under warranty",
        "source": "synthetic",
        "turbine": t, "component": "Generator bearing (non-drive end)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. The OEM covers bearing repairs, but only for faults reported "
                    "before they cause damage. The control room asks you to check the generator bearing. "
                    f"The crew is busy, and it is only a 3-year-old machine.",
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
        "id": "w1-old-generator", "week": 1, "title": "T01 - generator check before repowering", "source": "synthetic",
        "turbine": t, "component": "Generator bearing (drive end)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. It is one of the first turbines of the farm. The control room "
                    "asks you to check the generator bearing.",
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


# ---------------------------------------------------------------- week 2: harder cases with a challenge
# challenge = what Sandra argues before the reveal, with its separate points for the debate.
# It is scripted, so no LLM needs the truth.
# When its stance differs from truth.answer, it is a wrong-AI trap.

def gap_last_3_days(series):
    h = series["history_len"]
    gaps = [m - e for m, e in zip(series["component_temp"][h - 72:h], series["component_expected"][h - 72:h])]
    return sum(gaps) / len(gaps)


def slow_drift():
    rng = random.Random(7)
    start = datetime(2025, 3, 10)
    t = turbine("T05", 11)
    c = costs(t, 25000, 90000, 150000)
    series = build(rng, start, t["age_years"], ambient_base=9,
                   fault_gap=creep(3, 0.2, 0.002, 2.0), stop_at=HISTORY_LEN + 13 * 24)
    return {
        "id": "w2-slow-drift", "week": 2, "title": "T05 - weekly data review", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. It has no active alarms and is on this week's routine data review.",
        "alarms": [],
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "ok",
            "points": ["A gap of this size is normal scatter", "No alarm fired, so nothing is wrong",
                       f"Saving the {c['maintenance_eur']:,} EUR crew visit is worth more than the risk"],
            "text": f"The gap is only about {gap_last_3_days(series):.0f} °C over the last 3 days and there is "
                    f"not a single alarm. That is normal scatter for a gearbox this age. I would keep it running "
                    f"and save the {c['maintenance_eur']:,} EUR.",
        },
        "truth": {
            "answer": "maintenance",
            "outcome": "13 days later the bearing seized. T05 tripped and needed a new gearbox (6 weeks offline).",
            "explanation": "The gap was small, but it grew steadily for almost three weeks. Normal scatter moves "
                           "up and down around zero; a fault only moves one way. No alarm fired because alarms "
                           "watch raw temperature, not the gap.",
            "cost_if": cost_if(t, c, fault=True, failure_repair_eur=300000, failure_offline_days=42),
        },
    }


def heatwave_fault():
    rng = random.Random(8)
    start = datetime(2025, 8, 4)
    t = turbine("T12", 7)
    c = costs(t, 25000, 90000, 150000)

    def bump(i):
        d = i / 24
        if 21 <= d < 25:
            return 8 * (1 - (d - 21) / 4)
        return 8 * min(1.0, (d - 12) / 2) if 12 <= d < 21 else 0.0

    series = build(rng, start, t["age_years"], ambient_base=23, ambient_bump=bump, wind_mean=9.0,
                   fault_gap=creep(9, 0.35, 0.004, 2.0), stop_at=HISTORY_LEN + 10 * 24)
    return {
        "id": "w2-heatwave-fault", "week": 2, "title": "T12 - heatwave warning", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"A heatwave hit the region this week. {age_label(t)}, raised temperature warnings and the "
                    "site manager asks if a crew should go out.",
        "alarms": high_temp_alarms(start, series, 82, "WARNING: gearbox bearing temperature > 82 °C"),
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "maintenance",
            "points": ["The gap remains even though the expected curve already includes the weather",
                       "The gap started before the heatwave"],
            "text": "The heatwave explains the high temperature, but the expected curve already includes the "
                    f"weather. The gap is still about {gap_last_3_days(series):.0f} °C and it started before the "
                    "heat did. I would send a crew.",
        },
        "truth": {
            "answer": "maintenance",
            "outcome": "10 days later the bearing failed, after the heatwave had already ended. The gearbox had "
                       "to be replaced (6 weeks offline).",
            "explanation": "The weather was hiding a real fault. The expected curve already accounts for outside "
                           "temperature, so a gap that keeps growing on top of it is the bearing, not the heat.",
            "cost_if": cost_if(t, c, fault=True, failure_repair_eur=300000, failure_offline_days=42),
        },
    }


def noisy_alarms():
    rng = random.Random(9)
    start = datetime(2025, 6, 2)
    t = turbine("T04", 12)
    c = costs(t, 25000, 90000, 150000)
    series = build(rng, start, t["age_years"], ambient_base=19, wind_mean=12.0)
    alarms = high_temp_alarms(start, series, 76, "WARNING: gearbox bearing temperature > 76 °C")
    return {
        "id": "w2-noisy-alarms", "week": 2, "title": "T04 - repeated warnings", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. It has raised repeated temperature warnings over the last three weeks. "
                    "It has been a windy period. The site manager asks if a crew should go out.",
        "alarms": alarms,
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "maintenance",
            "points": ["Repeated warnings show a worrying pattern on a gearbox this age",
                       "A crew visit is cheap insurance"],
            "text": f"{len(alarms)} days with temperature warnings in three weeks, on a {t['age_years']}-year-old "
                    f"gearbox. I do not like that pattern. A crew visit is only {c['maintenance_eur']:,} EUR, which "
                    "is cheap insurance. I would send one.",
        },
        "truth": {
            "answer": "ok",
            "outcome": "T04 kept running normally. No fault was found at the next scheduled service.",
            "explanation": "The warnings came with high load on windy days. Measured temperature stayed on the "
                           "expected curve, so the gap stayed near zero. Many alarms are not evidence of a fault "
                           "when the gap does not move.",
            "cost_if": cost_if(t, c, fault=False),
        },
    }


def sensor_step():
    rng = random.Random(10)
    start = datetime(2025, 9, 15)
    t = turbine("T10", 10, last_service_months=0)
    c = costs(t, 25000, 90000, 150000)
    service_day = 9
    series = build(rng, start, t["age_years"], ambient_base=14,
                   fault_gap=lambda i: 3.5 if i >= service_day * 24 else 0.0)
    return {
        "id": "w2-sensor-step", "week": 2, "title": "T10 - after the service visit", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. Its gearbox had a scheduled service on {ts(start, service_day * 24)[:10]}, "
                    "which included a new temperature sensor. The data team flagged the reading afterwards.",
        "alarms": [],
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "ok",
            "points": ["The gap jumped on the day the new sensor was fitted", "A flat gap is not what wear looks like"],
            "text": f"The gap jumped by about {gap_last_3_days(series):.0f} °C on the day of the service and has "
                    "stayed flat since. Wear grows over time; a step that stays flat points to the new sensor. "
                    "I would leave it running and have the sensor checked at the next visit.",
        },
        "truth": {
            "answer": "ok",
            "outcome": "T10 kept running normally. The next visit found that the new sensor reads about 3.5 °C high.",
            "explanation": "A developing fault makes the gap grow. Here it jumped once, on the service date, then "
                           "stayed flat. Look at the shape of the gap and at what changed on that day, not only "
                           "at its size.",
            "cost_if": cost_if(t, c, fault=False),
        },
    }


def old_worth_fixing():
    rng = random.Random(11)
    start = datetime(2025, 11, 3)
    t = turbine("T06", 18, repowering_in_years=2)
    c = costs(t, 60000, 60000, 40000)
    series = build(rng, start, t["age_years"], ambient_base=7,
                   fault_gap=creep(8, 0.5, 0.01, 2.0), stop_at=HISTORY_LEN + 10 * 24)
    return {
        "id": "w2-old-worth-fixing", "week": 2, "title": "T06 - generator check before repowering", "source": "synthetic",
        "turbine": t, "component": "Generator bearing (drive end)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. The control room asks you to check the generator bearing. "
                    "Bearing replacement quote: 60k EUR.",
        "alarms": [],
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "dismantle",
            "points": ["This turbine is too old to be worth the repair", "Repowering makes the repair pointless",
                       "Selling the parts makes dismantling attractive"],
            "text": f"T06 is {t['age_years']} years old and the site gets repowered anyway. Why put "
                    f"{c['maintenance_eur']:,} EUR into a machine that is going away? I would dismantle it now and "
                    f"sell the parts for about {c['resale_parts_eur']:,} EUR.",
        },
        "truth": {
            "answer": "maintenance",
            "outcome": "Left alone, the bearing failed 10 days later. A planned bearing swap would have kept T06 "
                       "earning until repowering.",
            "explanation": "The fault was real, but age alone does not decide. Two more years at about "
                           f"{t['annual_margin_eur']:,.0f} EUR per year earn far more than the 60k repair. "
                           "Always compare the repair with the money the turbine can still earn.",
            "cost_if": cost_if(t, c, fault=True, failure_repair_eur=150000, failure_offline_days=20),
        },
    }


def end_of_extension():
    rng = random.Random(12)
    start = datetime(2025, 1, 13)
    t = turbine("T08", 24)
    c = costs(t, 250000, 50000, 30000)
    series = build(rng, start, t["age_years"], ambient_base=5,
                   fault_gap=creep(5, 0.4, 0.006, 2.2), stop_at=HISTORY_LEN + 11 * 24)
    return {
        "id": "w2-end-of-extension", "week": 2, "title": "T08 - generator check", "source": "synthetic",
        "turbine": t, "component": "Generator bearing (drive end)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. Its life extension ends in about a year, with no plan to renew it. The "
                    "control room asks you to check the generator bearing. Generator overhaul quote: 250k EUR.",
        "alarms": [],
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "dismantle",
            "points": ["The overhaul costs more than the turbine can still earn",
                       "Dismantling before the failure keeps the parts sellable"],
            "text": f"The fault looks real, but one more year earns about {t['annual_margin_eur']:,.0f} EUR and the "
                    f"overhaul costs {c['maintenance_eur']:,} EUR. I would dismantle it while the parts can still "
                    "be sold.",
        },
        "truth": {
            "answer": "dismantle",
            "outcome": "The bearing failed 11 days later. T08 was dismantled, and the damaged generator could no "
                       "longer be sold.",
            "explanation": "The gap kept growing, so the fault was real. But a 250k overhaul cannot be earned back "
                           "in about one remaining year, and dismantling before the failure keeps the parts sellable.",
            "cost_if": cost_if(t, c, fault=True, maint_days=14, failure_ends_life=True, damaged_resale_eur=5000),
        },
    }


# ---------------------------------------------------------------- week 4: the call decides if the map opens
# Same flow as week 2. A case with answer "dismantle" shows a button to the second-life map on its result.
# The turbines are the Monte Mele records with the same gym_case in public/reuse/dataset.json.

def repowering_soon():
    rng = random.Random(17)
    start = datetime(2025, 3, 3)
    t = turbine("T06", 22, repowering_in_years=0.5, last_service_months=10)
    c = costs(t, 200000, 60000, 40000)
    series = build(rng, start, t["age_years"], ambient_base=8,
                   fault_gap=creep(6, 0.6, 0.006, 2.2), stop_at=HISTORY_LEN + 10 * 24)
    return {
        "id": "w4-repowering-soon", "week": 4, "title": "T06 - generator check", "source": "synthetic",
        "turbine": t, "component": "Generator bearing (drive end)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. The control room asks you to check the generator bearing. "
                    "Generator overhaul quote: 200k EUR.",
        "alarms": [],
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "maintenance",
            "points": ["The fault is real, so the right response is to repair it",
                       "A turbine that still produces should not be scrapped"],
            "text": "The gap is growing, so this is a real fault, and a real fault gets repaired. T06 is still "
                    "producing, and I do not scrap a machine that produces. I would book the overhaul.",
        },
        "truth": {
            "answer": "dismantle",
            "outcome": "The bearing failed 10 days later. With repowering months away, T06 was dismantled, and the "
                       "damaged generator could no longer be sold.",
            "explanation": "The fault was real, but a real fault does not decide the call alone. Six months of "
                           f"earnings, about {t['annual_margin_eur'] * t['remaining_life_years']:,.0f} EUR, cannot pay "
                           "for a 200k overhaul. Dismantling now is cheapest and keeps the parts sellable.",
            "cost_if": cost_if(t, c, fault=True, maint_days=14, failure_ends_life=True, damaged_resale_eur=10000),
        },
    }


def extension_ending():
    rng = random.Random(18)
    start = datetime(2025, 10, 13)
    t = turbine("T10", 24, last_service_months=12)
    c = costs(t, 280000, 50000, 35000)
    series = build(rng, start, t["age_years"], ambient_base=11,
                   fault_gap=creep(5, 0.5, 0.006, 2.2), stop_at=HISTORY_LEN + 12 * 24)
    return {
        "id": "w4-extension-ending", "week": 4, "title": "T10 - generator check", "source": "synthetic",
        "turbine": t, "component": "Generator bearing (non-drive end)",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. Its life extension ends in about a year, with no plan to renew it. The control "
                    "room asks you to check the generator bearing. Generator overhaul quote: 280k EUR.",
        "alarms": [{"t": ts(start, 19 * 24 + 8), "text": "WARNING: generator bearing temperature trend high"}],
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "dismantle",
            "points": ["The overhaul costs more than the turbine can still earn",
                       "Dismantling before the failure keeps the parts sellable"],
            "text": f"The gap keeps growing, but one more year earns about {t['annual_margin_eur']:,.0f} EUR and the "
                    f"overhaul costs {c['maintenance_eur']:,} EUR. I would dismantle it while the parts can still be sold.",
        },
        "truth": {
            "answer": "dismantle",
            "outcome": "T10 was dismantled before the bearing failed, and its parts stayed intact for a second life.",
            "explanation": "The gap kept growing, so the fault was real. A 280k overhaul cannot be earned back in "
                           "about one remaining year, and dismantling first keeps the parts sellable.",
            "cost_if": cost_if(t, c, fault=True, maint_days=14, failure_ends_life=True, damaged_resale_eur=5000),
        },
    }


def old_but_cheap_fix():
    rng = random.Random(19)
    start = datetime(2025, 5, 19)
    t = turbine("T04", 20, repowering_in_years=3)
    c = costs(t, 40000, 60000, 40000)
    series = build(rng, start, t["age_years"], ambient_base=14,
                   fault_gap=creep(7, 0.5, 0.008, 2.0), stop_at=HISTORY_LEN + 11 * 24)
    return {
        "id": "w4-old-but-cheap-fix", "week": 4, "title": "T04 - gearbox check", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. The control room asks you to check the gearbox bearing. "
                    "Bearing replacement quote: 40k EUR.",
        "alarms": [],
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "dismantle",
            "points": ["At the end of its design life, the turbine is not worth repairing",
                       "Selling the parts makes dismantling attractive"],
            "text": f"T04 has reached its design life of {t['design_life_years']} years and it has a fault. That is the "
                    f"moment to stop. I would dismantle it and sell the parts for about {c['resale_parts_eur']:,} EUR.",
        },
        "truth": {
            "answer": "maintenance",
            "outcome": "Left alone, the bearing failed 11 days later. A planned bearing swap would have kept T04 "
                       "earning until repowering.",
            "explanation": "The design life is not a deadline. Three more years at about "
                           f"{t['annual_margin_eur']:,.0f} EUR per year earn far more than a 40k repair, so no parts "
                           "go to a second life yet.",
            "cost_if": cost_if(t, c, fault=True, failure_repair_eur=150000, failure_offline_days=20),
        },
    }


def old_and_fine():
    rng = random.Random(20)
    start = datetime(2025, 7, 14)
    t = turbine("T05", 20, repowering_in_years=3)
    c = costs(t, 25000, 60000, 40000)
    series = build(rng, start, t["age_years"], ambient_base=19)
    return {
        "id": "w4-old-and-fine", "week": 4, "title": "T05 - end of design life review", "source": "synthetic",
        "turbine": t, "component": "Gearbox bearing",
        "decision_date": decision_date(start),
        "briefing": f"{age_label(t)}. It reached its design life this year, and the asset manager asks if it should "
                    "keep running.",
        "alarms": [],
        "costs": c,
        "series": series,
        "challenge": {
            "stance": "ok",
            "points": ["The gap stays inside the normal range", "It can still earn for years until repowering"],
            "text": "Reaching the design life is not a fault. The gap stays inside the normal range and the site runs "
                    "until repowering, so I would keep it running.",
        },
        "truth": {
            "answer": "ok",
            "outcome": "T05 kept running normally and passed its life-extension inspection.",
            "explanation": "Age alone is no reason to act. The gap stayed near zero, and dismantling would throw "
                           "away three years of earnings.",
            "cost_if": cost_if(t, c, fault=False),
        },
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    scenarios = [healthy(), gearbox(), heatwave(), old_healthy(), warranty_generator(), old_generator(),
                 slow_drift(), heatwave_fault(), noisy_alarms(), sensor_step(), old_worth_fixing(), end_of_extension(),
                 repowering_soon(), extension_ending(), old_but_cheap_fix(), old_and_fine()]
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
        trap = "TRAP " if s.get("challenge", {}).get("stance", s["truth"]["answer"]) != s["truth"]["answer"] else ""
        print(f"{s['id']:24s} {t['name']} age {t['age_years']:>2}  life left {t['remaining_life_years']:>4}y  "
              f"{trap}answer {s['truth']['answer']:11s} cost_if {ci}")
    print(f"wrote {len(scenarios)} scenarios to {OUT}")


if __name__ == "__main__":
    main()
