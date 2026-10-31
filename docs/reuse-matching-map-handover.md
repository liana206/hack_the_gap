# Reuse Matching Map — Handover

Oct 31, 2026 · @Mu

## Purpose and context

The demo shows how an AI agent matches end-of-life wind turbine components — electrical components, structural steel and rotor blades (donors) — with second-life uses (receivers) years before dismantling. It illustrates the ownership stage of the Junior Loop pitch: a graduated junior owns end-of-life planning for the turbines they know from maintenance.

- **Programme framing:** from onboarding to ownership — onboard, master, extend, own.
- **Problem it answers:** circularity has no owner; planning starts too late; blades leave without condition evidence; donors and receivers are disconnected.
- **Objective 2:** flag each turbine years before decommissioning, turn its life record into a condition-verified material passport, rank second-life routes by waste hierarchy, cost, transport and carbon, and secure a route before dismantling. A senior signs the route.
- **Roles in the flow:** the AI agent ranks routes; the junior grades blade condition and checks the passport; the senior signs off.

## Scope of the demo

The prototype is an interactive web map with pseudo data; the AI agent is presented in the pitch but does not run. The matching and scoring logic is real code, so the ranking responds to inputs.

**In scope**

- Map of donors (wind farms with blade lots) and receivers (reuse projects, resale buyers, recyclers)
- Rule-based matching and scoring that stands in for the agent's output
- Per-match calculation: distance, transport mode, CO₂, transport cost, avoided emissions
- Time slider showing when turbines get flagged for end-of-life planning
- A material passport card per blade lot, graded by the junior
- A senior sign-off action on a chosen route

**Out of scope**

- A running AI agent or live data feeds
- Real Alpiq asset data: the hackathon rules allow public or synthetic data only
- Structural verification of blades for a given reuse
- Real market prices or contracts

Every screen labels its data as pseudo data.

## Locations and reuse streams

Every decommissioned item travels in two legs — wind farm to storage, then storage to its destination — and the map shows each location type in its own colour and measures each leg.

[embedded content: reuse flow · 2 legs, 3 item streams]

The storage hub is the new step: items wait there until matched, so leg 2 is planned only once a destination is confirmed.

**Location types on the map**

| Location type | Map colour (suggested) | Role in the flow |
| --- | --- | --- |
| Wind farm | Blue | Origin: items are dismantled here; the life record comes from here |
| Storage hub | Amber | Interim storage after dismantling; items wait here until matched |
| Construction site | Green | Destination: reuse in buildings and infrastructure |
| Other wind farm | Purple | Destination: reuse of components in an operating plant |
| Factory or remanufacturer | Grey | Destination: re-fabrication or remanufacturing |

**Items and their reuse streams**

| Item | Leg 1 | Leg 2: possible destinations | Matched on |
| --- | --- | --- | --- |
| Electrical components | Wind farm → storage | Other wind farm | Compatibility with the receiving plant, condition |
| Structural steel | Wind farm → storage | Factory or construction site | Dimensions, quantity, condition |
| Rotor blades | Wind farm → storage | Architecture project (construction site) or blade remanufacturer | Length, condition grade, timing |

Precedents per stream: [Business In Wind](https://windeurope.org/about-wind/circularity/) dismantles, refurbishes and resells used turbines; [EPFL stock-constrained design](https://infoscience.epfl.ch/entities/publication/392a9e8d-4bad-44b4-8f1c-1a37b216096c/thesisdetails) matches reclaimed steel elements to new structures; [Blade-Made](https://benzinga.com/z/47551433) and the Re-Wind BladeBridges reuse blades in architecture and infrastructure.

## Data model

Four record types: donor item lots, storage hubs and receivers are entered as pseudo data; matches are computed.

**Donor item lot (one per item type per wind farm)**

| Field | Example | Note |
| --- | --- | --- |
| id, farm name, country | D1, Aerorossa, IT | Real public farm name and site |
| lat, lon | 37.5, 13.9 | Approximate farm location |
| item type | Electrical / steel / blade | One lot per type |
| quantity | 126 blades | Aerorossa: 42 turbines × 3 |
| unit spec | Blade 40 m; steel section 4 m Ø; component model | Invented; what receivers match on |
| mass per unit (t) | 6 | Invented |
| commissioned | 2011 | Public |
| planned decommissioning | 2033 | Invented |
| condition grade | A / B / C | Set by the junior from the life record |
| repair history | 2 leading-edge repairs | Invented summary |
| passport complete (%) | 80 | Share of passport fields filled |

**Storage hub**

| Field | Example | Note |
| --- | --- | --- |
| id, name | S1, Catania hub | Invented |
| lat, lon | 37.4, 15.1 | Invented site, ideally near a port or motorway |
| accepted item types | Blades, steel |  |
| capacity | 60 blades | Invented |

**Receiver**

| Field | Example | Note |
| --- | --- | --- |
| id, name | R3, Harbour footbridge | Invented |
| destination type | Construction site / other wind farm / factory / remanufacturer | Sets the map colour |
| accepted item type | Blades | Electrical, steel or blades |
| lat, lon | 51.9, 4.5 | Invented site |
| requirement | Blade length 30–45 m; steel section and length; compatible turbine model | Per item type |
| quantity needed | 2 |  |
| needed by | 2034 |  |
| minimum grade | B | Structural uses need A or B |
| avoided CO₂ per unit (t) | 3 | Emissions of the new item it replaces; placeholder |
| hierarchy tier | 2 | 1 reuse as-is, 2 repurposing, 3 remanufacturing or recycling, 4 recovery |

**Match (computed)**

| Field | How |
| --- | --- |
| storage hub | Nearest hub that accepts the item type, or the one minimising total distance |
| leg 1 distance (km) | Wind farm → storage hub |
| leg 2 distance (km) | Storage hub → destination |
| transport mode | Whole or segmented (blades); standard freight (steel, electrical) |
| transport CO₂ (t) | Sum over both legs; formula in the next section |
| transport cost (€) | Sum over both legs: trucks × distance × rate |
| net CO₂ benefit (t) | Avoided CO₂ − transport CO₂ |
| timing fit, condition fit | 0–1 |
| score | Weighted sum within its tier |

**Pseudo-data guidance**

- Donors: Alpiq's publicly listed wind farms as sites (Ramacca, Aerorossa and Enpower 3 in Sicily; Cers and Roussas-Gravières in France; Tormoseröd in Sweden), each with three invented item lots: electrical components, structural steel, rotor blades.
- Storage hubs: 3 invented hubs, e.g. one each in Sicily, southern France and western Sweden.
- Receivers: about 12 invented destinations covering every type — 2–3 other wind farms (electrical), a steel factory and 2 construction sites (steel), 3–4 architecture projects modelled on documented blade reuse (playground, bike shelter, noise barrier, footbridge), a blade remanufacturer, plus a recycler and a cement co-processing plant as fallback routes.
- Keep specs and condition grades varied so that some matches fail the filters: the demo should show exclusions, not only successes.

## Matching logic and scoring

Routes are ranked by waste-hierarchy tier first, then by a weighted score within each tier. Landfill is never offered.

1. **Filter.** A donor–receiver pair is valid only if the item type matches, the unit spec meets the receiver's requirement (blade length, steel dimensions, component compatibility), the condition grade meets its minimum, and the items are available before the needed-by date.
2. **Rank by tier.** 1 reuse as-is (electrical components in another wind farm, steel in a new structure), 2 repurposing (blades in architecture), 3 remanufacturing or recycling, 4 recovery (cement co-processing). A valid tier-2 match always ranks above any tier-3 match.
3. **Score within the tier** using the formula below; default weights are equal and adjustable in the interface.
4. **Present** the top three routes per donor item lot, each with its calculation visible.

Transport CO₂ per match:

```latex
\text{CO}_2^{\text{transport}} = m \times \left(d_{\text{leg 1}} + d_{\text{leg 2}}\right) \times EF_{\text{truck}}
```

with item mass m in tonnes, road distance d in km for leg 1 (wind farm to storage) and leg 2 (storage to destination), and EF in t CO₂e per tonne-km. Road distance = great-circle distance × 1.3 as a placeholder road factor.

Transport cost:

```latex
C = \sum_{\text{leg}} n_{\text{trucks}} \times d_{\text{leg}} \times r_{\text{mode}}
```

Whole blades need one oversize truck each at a higher rate; segmented blades fit several to a standard truck but add a cutting cost per blade. Steel and electrical components travel as standard freight. The whole-versus-segmented toggle applies to blades and should visibly change both cost and CO₂.

Score within a tier:

```latex
S = w_1 F_{\text{timing}} + w_2 F_{\text{condition}} + w_3 \left(1 - \hat{E}\right) + w_4 \left(1 - \hat{C}\right)
```

with fits from 0 to 1, and transport CO₂ (Ê) and cost (Ĉ) normalised across the candidate routes. Net CO₂ benefit = avoided CO₂ − transport CO₂ is shown alongside the score.

**Placeholder values to source before the pitch:** the truck emission factor, the per-km rates for oversize and standard trucks, the cutting cost per blade, and the avoided CO₂ per receiver type. Mark them as assumptions on screen.

**A trade-off worth showing:** for reused steel, an EPFL study found long transport distances only marginally important for environmental impact, whereas deconstruction machinery mattered a lot. Blades may differ, because moving them intact is costly. The toggle lets the audience see where the balance lies.

## Interface and interactions

One screen: a map of Europe in the centre, controls on the left, a detail panel on the right.

**Map layers**

- Location markers, one colour per type (see Locations and reuse streams): wind farm, storage hub, construction site, other wind farm, factory or remanufacturer
- Flagged wind farms highlighted once they enter the planning window
- Route lines for a selected item lot: leg 1 dashed (wind farm → storage), leg 2 solid (storage → destination), coloured by score, with the distance labelled on each leg
- A legend for location colours and line styles

**Controls (left)**

- Year slider: wind farms turn to "flagged" once they enter the planning window
- Item-type filter: electrical components, structural steel, rotor blades
- Location-type toggles, to show or hide each colour
- Whole / segmented transport toggle (blades)
- Score weight sliders: timing, condition, CO₂, cost

**Detail panel (right)**

- Donor selected: material passport card (grade, repair history, availability, passport completeness) and the ranked route list
- Route selected: calculation breakdown (distance, trucks, transport CO₂, cost, avoided CO₂, net benefit, score)
- "Senior sign-off" button that marks the chosen route as approved

**Demo walkthrough (about 60–90 seconds)**

1. Move the year slider forward: the Sicilian farms turn to flagged.
2. Click Aerorossa: three item lots appear, each with the junior's condition grade and repair history.
3. Select rotor blades: leg 1 runs to the Sicily storage hub; leg 2 offers two architecture projects above a remanufacturer and a co-processing fallback; one project is excluded for blade length.
4. Switch to electrical components: the route leads to another wind farm. Switch to structural steel: a factory and a construction site appear.
5. Back on blades, switch to segmented transport: cost and CO₂ change, and the ranking may shift.
6. Press senior sign-off on the top blade route.

Narration: "The agent proposed this ranking; the junior verified the passport; the senior signs the route."

**Build notes**

- One self-contained HTML page; map via Leaflet with OpenStreetMap tiles loaded from a CDN
- Donors and receivers as a JSON array inside the page, so the data is easy to swap
- No backend; sign-off state lives in the page

## Positioning against precedents

Donor–receiver matching for blades already exists in research and industry; our contribution is connecting it to the turbine's live maintenance record and to a junior's ownership path.

| Precedent | What it does | Relation to our demo |
| --- | --- | --- |
| [EirBlade](https://www.mtu.ie/research/research-impact/eirblade/) (MTU/UCC, Ireland) | Repository with blade geometry and properties; locates the nearest suitable blades and when they become available | Closest precedent: static repository, no link to maintenance history |
| [Re-Wind](https://www.marei.ie/project/re-wind/) (MaREI) | GIS platform coupled with environmental, economic and social LCA of reuse strategies | Mapping plus impact assessment |
| [Columbia / Re-Wind map](https://datascience.columbia.edu/wp-content/uploads/2023/06/23_Poster.pdf) | Interactive map of wind farms, GHG radii and potential reuse sites | Nearly the same map concept |
| [DNV ReWind](https://www.offshore-mag.com/decommissioning/article/14305575/dnv-rewind-pilot-cuts-cost-and-time-of-planning-wind-turbine-decommissioning) | Generates a decommissioning plan including where blades can be recycled | Industry tool, decommissioning-stage |
| [DecomBlades](https://energycluster.dk/en/projects/results/decomblades-genanvendelse-af-materialer-fra-vindmollevinger) passport | Records which materials are in a blade and where; owner passes it to decommissioners | Passport standard to adopt |
| [Concular](https://circulareconomy.europa.eu/platform/en/good-practices/concular-digital-platform-enabling-circular-construction) | AI-driven matching of reclaimed building materials with demand, via material passports | Matching logic from construction |
| [Madaster](https://cordis.europa.eu/article/id/386930-facilitating-the-reuse-of-building-materials) | Material passport registry linked to reuse marketplaces | Passport and registry model |
| [Superuse Harvest Map](https://www.arch2o.com/?p=102409) | Map of available waste materials by location | Origin of the donor map idea |
| [EPFL stock-constrained design](https://infoscience.epfl.ch/entities/publication/392a9e8d-4bad-44b4-8f1c-1a37b216096c/thesisdetails) | Optimises assignment of reclaimed elements, with LCA incl. transport | Rigorous matching with carbon |

**What we add**

1. **Live condition evidence:** the passport is generated from the maintenance record the junior builds, not filled in at decommissioning.
2. **Years of lead time inside the operator:** the flag comes from Alpiq's own asset management, before any decommissioning decision.
3. **Operator-scale, cross-border:** one owner's farms across Italy, France and Sweden matched to receivers across Europe.
4. **A human ownership path:** a graduated junior owns the route with AI support; none of the precedents address who does this work.

Pitch line: "EirBlade showed that blades can be matched to designs; we connect that matching to the turbine's own life record, years before it comes down."

## Facts and figures for annotations

Use these as captions or a context strip in the demo; figures marked secondary should be stated as indicative.

| Figure | Value | Source |
| --- | --- | --- |
| European wind fleet at theoretical end of life by 2030 | About 80 GW of 290 GW; many will keep running | [WindEurope](https://windeurope.org/?p=48108) |
| Blade waste per year in Europe | About 25,000 t by 2025, rising to 52,000 t by 2030 | [WindEurope via Windtech](https://www.windtech-international.com/industry-news/wind-industry-calls-for-europe-wide-ban-on-landfilling-turbine-blades) |
| Blade material per capacity | About 10 kg per kW | [Down To Earth](https://www.downtoearth.org.in/energy/europe-bans-disposal-of-decommissioned-wind-turbine-blades-in-landfills-a-step-towards-life-cycle-sustainability-77835) |
| Industry landfill self-ban | From 1 January 2026 | [WindEurope](https://windeurope.org/?p=48108) |
| National landfill bans | Austria, Finland, Germany, Netherlands; no EU-wide ban yet | [Business Today](https://www.businesstoday.in/world/story/from-blades-to-buildings-skis-old-wind-turbines-are-getting-a-second-life-in-europe-555467-2026-09-15) |
| Landfill vs recycling cost | $60–150 vs $1,000–2,000 per t (secondary) | [Energy News Beat](https://energynewsbeat.co/?p=229503) |
| Cement co-processing benefit | 110 kg CO₂ and 461 kg raw material saved per t of blade waste | [WindEurope](https://windeurope.org/?p=30826) |
| Reuse footprint example | Wikado playground about 90% lower carbon than wood and steel equivalent (third-party assessment) | [Irish Times](https://www.irishtimes.com/business/2024/01/03/benches-playgrounds-and-bike-sheds-creative-ways-to-reuse-wind-turbine-blades) |
| Reuse track record | Blade-Made: 32 blades at 12 sites | [Benzinga](https://benzinga.com/z/47551433) |
| Alpiq Sicilian fleet | Ramacca 70.5 MW (since 2008); Aerorossa 84 MW, 42 turbines; Enpower 3 40 MW, 20 turbines | [Alpiq](https://www.alpiq.it:443/alpiq-group/media-relations/media-releases/media-release-detail/alpiq-realigns-cooperation-with-moncada) |
| Alpiq Swedish farm | Tormoseröd, 11 turbines, 72.6 MW | [Alpiq](https://alpiq.com/energy/assets/wind-power) |

Our own estimate, to be labelled as such: Aerorossa and Enpower 3 hold about 186 blades and roughly 1,200 t of blade material, reaching 20–25 years in about 2031–2036.

## Open decisions, risks and next steps

**Decisions for the team**

- Placeholder values: truck emission factor, oversize and standard truck rates, cutting cost, avoided CO₂ per receiver type. Source or clearly label each.
- Planning window: how many years before decommissioning a turbine is flagged (suggest 3–5 for the demo).
- Whether resale and life extension appear as routes in the demo or only in the narration.
- Number of receivers (suggest 10–12) and how many deliberately fail the filters.

**Risks to address in the pitch**

- Reuse demand is small compared with blade volumes: show a realistic split, with most blades going to recycling or co-processing.
- An early end-of-life flag can become self-fulfilling if it reduces maintenance spending: the flag triggers planning only, and life extension stays top-ranked until a senior rejects it.
- Close resemblance to EirBlade and the Re-Wind map: cite them and lead with the life-record link.

**Next steps**

- [ ] Build the pseudo dataset (donors and receivers JSON)
- [ ] Implement filter, tier ranking and scoring
- [ ] Build the map page with layers, controls and detail panel
- [ ] Add the passport card and sign-off action
- [ ] Rehearse the 60–90 second walkthrough
- [ ] Write the slide line on precedents and differentiation

## Sources

**Reuse projects**

- [WindEurope: circularity projects](https://windeurope.org/?p=47705)
- [WindEurope: circularity overview](https://windeurope.org/about-wind/circularity/)
- [Superuse Studios: Wikado](https://www.superuse-studios.com/?p=52109)
- [Superuse Studios: Bleekerseiland](https://www.superuse-studios.com/?p=54542)
- [Re-Wind BladeBridges (Leeds Beckett)](https://eprints.leedsbeckett.ac.uk/id/eprint/9396)
- [CompositesWorld: Atlanta BladeBridge](https://compositesworld.com/news/re-wind-network-completes-first-us-bladebridge-in-georgia)

**Mapping and matching**

- [Aalborg University, PLATE 2025: matching strategies](https://journals.aau.dk/index.php/plate2025/article/view/10269)
- [QUB thesis: GIS framework for blade repurposing](https://pure.qub.ac.uk/en/studentTheses/developing-a-gis-based-decision-making-framework-for-the-repurpos/)
- [ORE Catapult: TRACE tool](https://ore.catapult.org.uk/resource-hub/analysis-reports/turbine-recycling-and-circular-economy-trace-tool)
- [NCC: SusWind mapping](https://nccuk.com/what-we-do/sustainability/suswind/recycle)
- [tomorrow.city: Concular](https://www.tomorrow.city/?p=41489)
- [EPFL: Phoenix3D interactive matchmaking](https://infoscience.epfl.ch/record/307545/files/2023%20IASS%20%28Interactive%20design%20with%20optimum%20matchmaking%29.pdf)
- [Utility Dive: blade transport and recycling cost](https://www.utilitydive.com/news/ge-announces-european-partnerships-to-advance-full-wind-turbine-recycling/601803/)

Precedents and figures are linked in their tables above.
