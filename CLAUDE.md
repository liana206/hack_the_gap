PROJECT CONTEXT (for CLAUDE.md)
Hackathon "Hack the Gap" 2026, challenge by Alpiq (Swiss energy company): design how
juniors and AI work together so juniors get BETTER, not weaker, and stay able to
catch the AI when it is wrong. We chose Track B "Judgement Gym": a simulator where a
junior makes realistic calls on historical data and an AI senior challenges the
reasoning.

Our domain: wind turbine maintenance. The junior reads SCADA sensor data (real data
later: CARE to Compare dataset, Wind Farm A) and decides: nothing wrong / call
maintenance / dismantle (end of life). Environmental angle: dismantled turbines are
huge waste; reusing or selling parts saves cost.

Judging: learning effect 30% (skill growth must be MEASURABLE), real oversight 25%
(clear who decides, the human stays able to challenge the AI), fit to a real business
problem 20%, working prototype 15%, honesty about limits 10%.

Design rules:
- The app grows week by week. Each week switches on feature flags in src/weeks.ts.
  Week 1 basics, week 2 think-first + strict senior + wrong-AI traps, week 3 smart
  maintenance scheduling with fake price data, week 4 second life / recycling agent.
- Scores come from code against the real outcome, never from the LLM's opinion.
- The senior must never see or leak the truth before the reveal (from week 2 on).
- Keep it simple: few files, no extra frameworks, the demo must run offline-safe.
- Team: P1 builds real data in pipeline/ in the same JSON format; the app must
  work with mock and real files without changes.