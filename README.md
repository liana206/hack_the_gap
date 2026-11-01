# From Onboarding To Ownership

Hack the Gap 2026 · Alpiq challenge · Track B Judgement Gym.

A training simulator in which a junior asset manager makes wind turbine maintenance calls on historical
SCADA-style data (**nothing wrong / call maintenance / dismantle**), argues with an AI senior who is
sometimes wrong on purpose, and is then scored **in code against what really happened**.

## Objective

Judgement in asset management normally takes years to build because a junior sees only a handful of real
failures, and each one is expensive. This app compresses that experience. The junior works through
cases built on historical sensor data (synthetic in this prototype), makes a call at a fixed decision
date, and then sees the hidden future. This shows whether the bearing really failed, and what each possible call would have cost. Many cases in one afternoon give the kind of feedback and experience that would otherwise longer to gain. 

The AI is there to make the junior a better decision-maker, not to make decisions for them. The junior
always decides first. The AI senior, "Sandra", explains, challenges and coaches, but she never grades based on her opinion. Correctness comes from the real outcome and the reasoning grade comes from a fixed checklist, both computed in code. From stage 2 on she is sometimes wrong on purpose to make the junior learn to check an AI's argument against the data instead of trusting it.

Once the junior has mastered the maintenance call, the programme extends to what happens at the end of
a turbine's life. Dismantled turbines are a large waste stream with multiple parts such as blades, tower steel and electrical parts. In the last stage the junior plans where those parts go, reused, resold or recycled, weighing cost against environmental impact. The second-life map shows the ongoing and announced projects that could take these parts, so the decision is grounded in where demand actually is.

### The stages

The app grows stage by stage. Each stage switches on more features (`src/weeks.ts`).

| Stage | What the junior does | How the AI helps them learn |
|---|---|---|
| **1 · Read the signals** | Six cases. Read the temperature, gap and conditions charts, then click a call. | After the reveal, Sandra coaches in a friendly style. She explains what mattered in the data and some guideline to base the decision from.|
| **2 · Think first, then challenge** | Six cases. Write a reason first (at least 15 characters), then lock in a first call. | Before the reveal, Sandra argues a position, which is sometimes a deliberate trap. The junior debates her. The debate ends when her arguments are answered, after 8 replies, or when the junior says they are satisfied with their case. After the reveal, she admits a trap, names the flaw, and lists what the junior left unanswered. |
| **3 · Smart scheduling** | *Not built yet* . See [To be implemented](#to-be-implemented). This could be a task left the junior. | |
| **4 · Second life** | Four cases, decided as in stage 2. When the right call is dismantling, a button opens the second-life map for that turbine. | On the map, rule-based matching proposes three alternative plans for the turbine's blades, steel and electrical parts, each with cost, CO₂ and embodied energy. The junior proposes a plan and a senior signs it off. |

The learning log in the sidebar makes progress measurable. For each stage it shows:
- first-try accuracy (replaying a case does not improve it)
- the average reasoning detail score (out of 7)
- how many wrong-AI traps the junior caught

## Run

You need Node.js 20.19 or newer (Vite 8 requires it). Python 3 is only needed to regenerate the cases.

```bash
npm install                                 # 1. download the packages listed in package.json
cp .env.example .env                        # 2. create your local config, then add GEMINI_API_KEY
npm run dev                                 # 3. start the app at http://localhost:5173
```

1. **`npm install`** downloads React, Recharts, Leaflet, Vite and the other packages into `node_modules/`.
   Run it again after every `git pull` that changes `package.json`. Otherwise there will be errors like
   `Failed to resolve import "leaflet"`.
2. **`cp .env.example .env`** creates a local config file. `.env` is git-ignored, so the key stays
   on one's local machine.
   - `GEMINI_API_KEY` is optional. Without it, Sandra gives a built-in offline reply and the demo still works.
   - `GEMINI_MODEL` sets which Gemini model is tried first.
3. **`npm run dev`** starts the Vite dev server. It also runs the small `/api/gemini` proxy, which adds
   the key on the server side so it never reaches the browser.
   - The terminal logs which model answered, e.g. `[gemini] answered by …`.
   - Restart it after changing `.env`.


## Structure

Note: the UI calls the 4 steps stages; in the code they are still weeks (`src/weeks.ts`, `weekN`). This is because initially we thought of a weekly advancement schedule.

| File | What |
|---|---|
| `src/weeks.ts` | Stage 1–4 definitions and feature flags (`thinkFirst`, `strictSenior`, `traps`, `scheduling`, `secondLife`, `readingHelp`). New stage = implement flag + `ready: true`. |
| `src/types.ts` | Scenario JSON format, log entry, debate record, answer options |
| `src/senior.ts` | Case summary computed in code (never raw arrays), reasoning checklist (`gradeReasoning`), Sandra's coaching and debate prompts, Gemini call, offline fallback |
| `src/App.tsx` | Layout, case loading, scoring, localStorage learning log, link to the stage 4 map |
| `src/components/` | Stage picker, case list, facts, charts, decision cards, debate with Sandra (`ChallengePanel`), reveal, senior chat |
| `src/reuse/` | Stage 4 second-life map: farms, storage hubs and receivers, matching rules, three plans, senior sign-off (Leaflet map) |
| `public/scenarios/` | Generated case files, one JSON file per case, plus `index.json` |
| `public/reuse/dataset.json` | Stage 4 data: 8 wind farms (public specs), storage hubs, 39 receivers (reuse projects, other wind farms, factories, recyclers) |
| `vite.config.ts` | Dev-server proxy `/api/gemini`: forwards `{system, messages}` to Gemini with the key added on the server. Falls back to other models when one is busy, and tries the last model that answered first. |
| `pipeline/` | Case generator + [format docs](pipeline/README.md) |
| `docs/` | Stage 4 research, rules and handover notes, UI redesign spec |

## Limitations

- **The junior always decides.**
  - In stage 1, Sandra only speaks after the call is locked in.
  - In stage 2 and later, she debates before the reveal. Her prompt then contains only the case facts
    the junior can see, never the outcome (`buildDebatePrompt` in `src/senior.ts`).
- **Correctness comes from `truth.answer`, never from the LLM.**
  - The reasoning detail grade is a fixed keyword checklist, also in code. It measures how much
    evidence was covered, not whether the reasoning is right.
  - Sandra's verdicts in the debate only count if the words she quotes really appear in what the junior wrote.
- **The debate is feedback only.** It never changes the score. The junior can end it at any time and
  still lock in their own call.
- **All data is synthetic.**
  - The cases are hand-designed and follow realistic fault patterns (a bearing fault shows as a growing
    gap between measured and expected temperature). We chose this over a real dataset so every case
    teaches one clear lesson and the outcome is known.
  - Costs are illustrative, not real Alpiq figures.
  - The stage 4 receivers are pseudo data modelled on real kinds of projects.
- **Known limits.**
  - The case files are served to the browser with the answer inside. The UI hides it until the reveal,
    but a technical user could find it in the browser's developer tools.
  - Sandra's replies depend on Gemini's availability. When it is down, the app falls back to a built-in reply.

## To be implemented

- **Automatic advancement between stages.** Unlock the next stage when the junior meets a clear
  criterion. Examples: all cases of the current stage right on the first try, a minimum reasoning
  detail score, and, from stage 2, every trap caught. Today the stages can be opened freely.
- **Stage 3: smart maintenance scheduling.** Once a repair is needed, *when* to do it also matters. A
  repair during a windy, high-price week loses much more income than one during a calm, cheap week, but
  waiting too long risks the part failing. The planned approach has three steps:
  - estimate how much time is left before failure from the trend of the temperature gap (simple pattern
    recognition on the sensor data);
  - combine that with wind forecasts and electricity prices;
  - suggest the cheapest window that still keeps the risk low.

  The junior picks the window, and the code scores it against the real outcome, as in the other stages.
  The code itself could also be implemented by the junior.

## Use of AI in building this project

We used Claude Code (Anthropic) throughout development, for both the backend logic and the UI. It was
used especially to set up the main skeleton of the app (the stage structure, case format, charts and
Gemini proxy) and to debug. We reviewed and tested the code. The concept and the design decisions are our own.

Inside the product, Gemini (Google) is the language model behind Sandra.
