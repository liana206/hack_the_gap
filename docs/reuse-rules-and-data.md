# Reuse Matching: Real Data and Rules

Oct 31, 2026 · companion to [reuse-matching-map-handover.md](reuse-matching-map-handover.md)

The research turned up four things that change the matcher:

1. **Product or waste status is an input, not something the matcher works out.** Whether an item counts as a product or as waste has legal consequences: permits, notification for cross-border shipments, storage time limits. That status will come from the earlier steps, in the sensor and maintenance data of the company dataset. For now the matcher reads it as a field on each lot (`item_status`, default `product`) and only applies the rules that depend on it.
2. **France sets hard quotas at farm level.** Its dismantling rules require a minimum share of rotor mass to be reused or recycled. Ranking each route on its own is not enough for French farms: the matcher must check that the whole lot plan meets the quota.
3. **Receivers are pseudo targets that stand for real kinds of demand.** We don't map real recycling plants. Each receiver is invented, but modelled on a real kind of demand: architecture open calls, public infrastructure the government has planned (greenway bridges, motorway noise barriers, bike-shelter programmes), plus a pseudo recycler and a pseudo co-processing plant as fallbacks. See section 2.
4. **Several "bans" are weaker than they sound.** Germany is strict. The Netherlands has exceptions. Denmark, Spain, Italy and Switzerland (for material recycling) have no blade-specific ban. "No landfill" is therefore mostly a company and industry commitment (WindEurope, from 1 Jan 2026), not law. The UI should show which constraints are legal and which are policy.

Confidence markers used below: **✔ verified** (primary or official source read), **~ likely** (consistent secondary sources), **? unverified** (open, check before the pitch).

---

## 1. Alpiq wind farms (real, public data)

Source: Alpiq asset pages unless noted. Coordinates are approximate, taken from the municipality; replace them with exact ones if needed. Blade length is derived from rotor diameter (≈ rotor/2 − ~1 m hub) and is an estimate.

| Farm | Country | Location | MW | Turbines | Model | Blade length (est.) | In service | Alpiq share | Approx. lat, lon |
|---|---|---|---|---|---|---|---|---|---|
| Monte Mele | IT | Agrigento / Realmonte, Sicily | ~9 | 11 | ? not published | ? | 2005 (Alpiq since 2018) | ~ 100% | 37.31, 13.46 |
| Ennese (Ramacca) | IT | Ramacca, Raddusa, Castel di Iudica, Sicily | 70.5 | 47 | Ecotecnia ECO 80 (1.5 MW) | ~39 m | 2008 | ~ 100% | 37.42, 14.62 |
| Cattolica Eraclea (Enpower 3) | IT | Agrigento province, Sicily | 40 | 20 | Gamesa G8X (2 MW); database says 14× G87 + 6× G83 | ~40–42 m | 2011 | ~ 100% | 37.44, 13.40 |
| Rocca Rossa (Aerorossa) | IT | Caltanissetta / Palermo / Agrigento, Sicily | 84 | 42 | Gamesa G90 (2 MW) | ~44 m | 2011 | ✔ 100% | 37.70, 13.65 |
| Roussas-Gravières | FR | Roussas, Drôme | 10.5 | 6 | Vestas V66 (1.75 MW) | ~32 m | 2006 (Alpiq since 2008) | ~ 100% | 44.44, 4.81 |
| Cers | FR | Les Corbières, near Carcassonne | 11.5 | ? | ? | ? | ? (Alpiq share since 2010) | ~ 15% (minority) | 43.08, 2.62 |
| Le Peuchapatte | CH | Muriaux, Jura | 6.9 | 3 | Enercon E-82 E2 (2.3 MW), hub 108 m | ~39 m | Jan 2011 | ? (via Eole Jura SA) | 47.24, 6.98 |
| Tormoseröd | SE | Västra Götaland (? verify) | 72.6 | 11 | Siemens Gamesa SG 6.6-155 | ~76 m | 2023–24 | ✔ 30% (Fu-Gen 70%) | 58.4, 11.9 (?) |

Swiss projects (Bel Coster 27 MW / 9 turbines, EolJorat Nord, Tous-Vents, Vaud'Air) are not built and are not donors.

**What this means for the demo dataset**

- **The oldest farms are flagged first:** Monte Mele (2005), Roussas (2006) and Ennese (2008) reach 20–25 years around 2025–2033. These, not Aerorossa, should be the first farms the year slider flags. Rocca Rossa, Cattolica Eraclea and Peuchapatte (2011) follow around 2031–2036.
- **Tormoseröd** is new (2023) and should appear only as a receiver site or far in the future, not as a donor.
- **Resale is a real route.** V66, ECO 80, Gamesa G8X/G90 and E-82 are all models with an active second-hand market. Dealers such as Dutchwind, Business in Wind (Barneveld, NL), REI Wind and MKWind trade 600 kW–2.3 MW Vestas and Enercon machines. Whole-turbine resale should be a tier-1 route, not just narration.
- **Ownership share decides who signs.** Cers (~15%) and Tormoseröd (30%) are minority holdings, so Alpiq cannot sign a route alone. The data model needs `alpiq_share`, and the sign-off step needs a "co-owner approval" flag.

## 2. Storage hubs and receivers: pseudo targets

All hubs and receivers are **pseudo targets**: invented names, sites, quantities and dates, each labelled "pseudo" on screen. What makes them believable is that each one follows a **real kind of demand**, so the pitch can say "this is the kind of project that would take these blades".

### Kinds of receivers

| Kind | Modelled on (real precedent) | Typical requirement | Tier |
|---|---|---|---|
| **Architecture open call**: a competition for a small building made of blades | Gdańsk University of Technology open competition for a temporary bike shed made of decommissioned blades (entrants work from a 3D blade model; several blades allowed) | 1–6 whole blades, any grade ≥ B, a blade geometry model in the passport | 2 |
| **Greenway / cycle bridge** in a public active-travel plan | Re-Wind BladeBridges (Midleton greenway, Cork, Ireland; Draperstown, Northern Ireland); Anmet bridge in Poland (2021) | 2 whole blades of 30–45 m, grade A, structural approval | 2 |
| **Motorway noise barrier** in a road-authority programme | Blade-Made "Blade Barrier" (NL); Białystok University of Technology research on road noise barriers | 20–100 blades, segments allowed, grade B–C | 2 |
| **Street furniture / bus-shelter programme** of a municipality | Danish bike shelters and benches; Wikado playground (Rotterdam) | 5–30 blades, segments allowed, grade C allowed | 2 |
| **Other wind farm** (electrical components, whole-turbine resale) | Dealer market for V66, ECO 80, G8X/G90 and E-82 (Dutchwind, Business in Wind) | Compatible model, condition | 1 |
| **Steel factory / construction site** | EPFL reclaimed-steel matching | Section, length, quantity | 1 / 3 |
| **Pseudo recycler** | Any material-recycling plant | Any grade, any form | 3 |
| **Pseudo co-processing plant** | Cement co-processing | Any | 4 |

### Each receiver is a demand signal on a timeline

A government project or an open call is not a sure buyer. Each receiver goes through stages:

```
announced → call open / in planning → design selected / tendered → construction start (= needed_by)
```

Each stage gets a **certainty** value (suggested: announced 0.3, call open 0.5, selected/tendered 0.8, contracted 1.0). The matcher uses it in two ways:

- **Score:** add a certainty fit as a fifth term (see section 4), so a contracted bridge beats an announced one when everything else is equal.
- **Fallback:** a lot never relies only on routes with low certainty. Every lot keeps a fallback with certainty 1 (pseudo recycler or co-processing plant), so the plan still holds if a call never turns into a project.

### Demo set (suggested, about 12 pseudo receivers)

- 2 open calls (one in Sicily, one in southern France), different blade counts, one with an early deadline that excludes the youngest farms
- 1 greenway bridge (needs grade A, 2 × 40–45 m blades): fits the Aerorossa G90 blades, excludes the Roussas V66 blades (32 m, too short)
- 1 noise-barrier programme (large quantity, accepts segments): the main volume route
- 1 bus-shelter programme (accepts grade C)
- 2 other wind farms (one compatible with V66, one with ECO 80) for resale and electrical components
- 1 steel factory, 1 construction site
- 1 pseudo recycler, 1 pseudo co-processing plant (fallbacks)
- 3 pseudo storage hubs: Sicily (near a port), southern France, central Europe

## 3. Regulations by country

### EU (applies to IT, FR, DE, DK, NL, ES, SE)

| Rule | What it says | Confidence | Matching impact |
|---|---|---|---|
| Waste Framework Directive 2008/98, Art. 3 & 4 | "Waste" = what the holder discards, intends or is required to discard. Reuse means use for the same purpose by items that are *not* waste. The hierarchy runs prevention/reuse → preparing for reuse → recycling → other recovery → disposal. | ✔ | The tier order is legally grounded. Product status depends on proven intent to reuse. |
| Landfill Directive 1999/31, Art. 2(g) | Storage of waste for more than 3 years before recovery, or more than 1 year before disposal, counts as a landfill | ✔ (well known; re-check text) | **Hard timing rule for hubs**: a waste lot may wait at most 3 years in storage before recycling or recovery. |
| Waste Shipment Regulation (EU) 2024/1157 | Cross-border shipments of waste for recovery need prior written notification and consent, done electronically (DIWASS). Most provisions apply from 21 May 2026, export rules from 21 May 2027. | ✔ | Waste routes that cross a border need a "notification" flag plus lead time. Reuse routes for products do not. |
| Construction Products Regulation (EU) 2024/3110 | Reused and remanufactured products can be placed on the market with declared performance, but only once harmonised specifications exist. Most rules apply from 8 Jan 2026. | ~ | Structural reuse (footbridge, steel in a building) needs case-by-case approval for now. Add `needs_approval` and lead time to receivers. |
| WindEurope industry pledge | Self-imposed landfill ban on blades from 1 Jan 2026, and no shipping blades outside Europe for landfill | ✔ (voluntary) | Encode as **policy**, not law. |
| EU blade landfill ban | Called for, **not enacted** as of 2026 | ✔ | — |

### France (origin: Roussas, Cers)

- **✔ Arrêté of 22 June 2020** (amends the 26 Aug 2011 ICPE heading 2980), Art. 20. For turbines dismantled from 1 July 2022:
  - at least **90% of the total turbine mass** (including foundations; 85% if foundation excavation is waived) must be reused or recycled;
  - at least **35% of rotor mass** must be reused or recycled.
- For turbines whose authorisation was filed later: 95% of total mass reusable or recyclable from 2024; rotors 45% from 2023 and **55% from 2025**. That applies to new builds, not to Roussas or Cers.
- **✔ Decommissioning guarantee:** €50,000 per turbine up to 2 MW, plus €10,000 per additional MW.
- **? Open:** does cement co-processing count toward the rotor "recycled" share? The mineral fraction that ends up in clinker is often counted as recycling, but we have not verified the French rule. Until we have, treat co-processing as **not counting** (the conservative choice).
- **Matching impact:** for a French donor, the lot plan must send ≥35% of rotor mass to tier 1–3 routes. A plan that sends everything to co-processing fails. Show a compliance bar per French farm.

### Germany (destination: Lägerdorf, receivers)

- **~ Landfill ban** for blades in practice since 2005/2009. Waste with organic content above a threshold may not be landfilled, and epoxy-based blades exceed it. Sources give 3% or 5% as the threshold (TOC limit in the landfill ordinance); check which.
- **~ KrWG §6:** the five-step waste hierarchy is binding on the waste holder, which matches our tier ranking.
- **~ BauGB §35(5):** decommissioning obligation with financial security; the amount differs by Land.
- **? DIN 4866** (dismantling and recycling standard, reportedly from 2026): status not verified.
- **Matching impact:** Germany as a destination accepts co-processing and recycling, never landfill. Structural reuse needs German building approval (likely a case-by-case approval).

### Netherlands (destination: Business in Wind, Eemshaven, architecture projects)

- **✔ BSSA** (Besluit stortplaatsen en stortverboden afvalstoffen) bans landfilling of composites, with TOC limits. But **Art. 11 exemptions** allow landfill when treatment is "not technically feasible", and per the IEA Task 45 review that can apply to blades. So it is a ban in name, with a real loophole.
- **Matching impact:** a strong destination for reuse (dealer market, Superuse/Wikado precedents). Never offer landfill, even though the exemption exists.

### Denmark (destination: second-hand market, Esbjerg)

- **✔ No blade-specific landfill ban.** Municipalities decide between recycling, incineration and landfill (parliament answer, 2021–22). A 2023 report by the Danish EPA (Miljøstyrelsen) *recommends* limiting landfill. Expected volume: at least 121,000 t of composite waste over 25–30 years.
- **Matching impact:** landfill is legally possible in Denmark, so excluding it is policy. Show the "policy" badge.

### Spain (destination: Navarra recyclers)

- **~ No national blade landfill ban found.** The landfill regime is RD 646/2020, under which blades count as non-hazardous construction and demolition waste. The waste law Ley 7/2022 (replacing Ley 22/2011) introduced a landfill tax (? amount and effect on blades unverified). The sector body AEE has committed voluntarily to 100% reuse, recycling or recovery.
- **Matching impact:** Spain is the nearest material-recycling destination by sea from Sicily (EnergyLOOP, Cortes). It is a cross-border waste shipment from Italy or France, so it needs notification.

### Switzerland (origin: Le Peuchapatte)

- **~ Landfilling of rotor blades is prohibited** (BAFU, quoted by Keystone-SDA).
- **~ VVEA Art. 10:** combustible waste must be thermally treated if it is not recovered as material. In practice blades are burned in special plants and the ash goes into cement.
- **~ No material-recycling plant in Switzerland** for blades.
- **~ Precedent: every turbine dismantled in Switzerland so far was sold and re-erected elsewhere** (Suisse Eole; BFE says "sold completely").
- **? Waste export:** Switzerland is outside the EU Waste Shipment Regulation. Exporting waste requires FOEN/BAFU approval under the movements-of-waste ordinance (VeVA). Exact procedure not verified.
- **Matching impact:** for Peuchapatte the default top route is **whole-turbine resale** (product, no waste procedure). Any waste route means export, and the only domestic option is thermal treatment, which counts as recovery (tier 4).

### Italy (origin: 4 Sicilian farms) and Sweden

- **~ Italy:** decommissioning and site restoration under DM 10 Sept 2010 (authorisation guidelines for renewables); waste under D.Lgs 152/2006. We found no blade-specific ban and no Italian recycling plant. Italian landfill acceptance criteria (D.Lgs 36/2003 as amended) are still unverified.
- **~ Sweden:** landfill ban on combustible waste (2002) and organic waste (2005), with exemptions possible for "special reasons". Blade-specific practice not verified. Vattenfall pledged not to landfill blades.

### Transport (all countries)

- **~** Anything longer than **16.5 m** (articulated vehicle), wider than 2.55 m, taller than 4 m or heavier than 40–44 t needs an oversize permit. Every whole blade in our fleet (32–44 m) is oversize.
- **~** Permit costs per country: DK €50–100, DE €40–800+, IT/FR €30–500+. A whole blade crossing several countries needs a permit in each.
- **?** Euro-per-km rates and cutting cost per blade: no reliable European source found; they stay as labelled assumptions.

---

## 4. Revised matching rules

The handover's filter → tier → score pipeline stays. Below are the changes.

### Tiers (revised)

| Tier | Route | Legal status of the item | Examples |
|---|---|---|---|
| 1 | **Reuse as-is**: whole-turbine resale, component spares, electrical components in another plant | Product (if matched before dismantling) | Dealer → re-erection; gearbox/generator spares |
| 2 | **Repurposing**: architecture and infrastructure | Product if the buyer is fixed in advance; otherwise waste then end-of-waste | Footbridge, bike shelter, playground |
| 3 | **Recycling / remanufacturing** | Waste | EnergyLOOP, RenerCycle, steel mill |
| 4 | **Other recovery**: cement co-processing, thermal treatment | Waste | Lägerdorf; Swiss thermal treatment |
| — | Landfill; export outside Europe for landfill | Never offered (policy, and law in DE / NL / CH) | — |

### New filters (a route is excluded, with the reason shown)

1. **Storage time limit (law), only if `item_status = waste`** (read from the lot, not computed): storage at the hub ≤ 3 years before recycling or recovery, ≤ 1 year before disposal.
2. **Approval lead time.** Receivers with `needs_approval` (structural reuse under CPR or national building law) require `needed_by − available ≥ approval_months`, grade A (B only if the receiver says so) and passport completeness ≥ a threshold (suggest 90%).
3. **Segmentation kills whole-blade reuse.** If blades are segmented, receivers with `needs_whole_blade` are excluded with the reason "needs whole blade".
4. **Ownership.** A lot with `alpiq_share < 100%` can still be ranked, but sign-off is blocked until "co-owner approved" is set.

### New lot-level checks (on the allocation, not on single routes)

5. **Quantity allocation.** Fill the receivers greedily: tier first, then score, then remaining capacity. The rest goes down the tiers. The UI shows the split, e.g. "6 resold · 4 repurposed · 80 recycled · 36 co-processed".
6. **French rotor quota.** For donors in FR: ≥35% of rotor mass must be in tiers 1–3 (co-processing counts as 0 until verified), and ≥90% of total turbine mass reused or recycled. Show a pass/fail bar. A failing plan cannot be signed.

### New route attributes (computed and shown)

7. `item_status`: product or waste, **taken from the lot**. It will come from the sensor and maintenance data later; until then it is `product` by default, and the demo can set it per lot.
8. `cross_border`: origin country ≠ destination country.
9. `notification_required` = waste **and** cross_border. Add a lead-time penalty (suggest 2–3 months, labelled as an assumption) and a note: "EU WSR 2024/1157" or, for CH, "VeVA / FOEN".
10. `permits`: number of countries a whole-blade oversize load crosses × a per-country permit cost (added to transport cost).
11. `constraint_source` on every exclusion or check: **law** (with country and article) or **policy** (WindEurope pledge / Alpiq rule). This is the honesty layer: the user sees why something is excluded and whether a regulator or Alpiq decided it.

12. **Fallback guarantee.** After allocation, every unit of a lot must have a route. If routes with certainty < 1 take part of the lot, the plan also names the certainty-1 fallback (pseudo recycler or co-processing plant) the units fall back to if that demand never comes.

### Score (one new term, two inputs adjusted)

```latex
S = w_1 F_{\text{timing}} + w_2 F_{\text{condition}} + w_3 \left(1 - \hat{E}\right) + w_4 \left(1 - \hat{C}\right) + w_5 F_{\text{certainty}}
```

- `F_certainty` = the receiver's stage certainty (0.3 / 0.5 / 0.8 / 1.0). It gets its own slider.
- Timing fit now includes the approval and notification lead times, not only `needed_by − available`. For an open call, `needed_by` is the construction start after the jury; the submission deadline only decides whether the passport (incl. blade geometry) has to be ready by then.
- The cost normalisation includes permit and notification costs.

## 5. Data model changes

**Farm (donor site):** `country, lat, lon, model, turbines, mw, commissioned, est_end_of_life, alpiq_share, regime` (`FR_2020` / `none`).

**Lot:** `+ total_mass_t` (needed for the French quota), `+ is_rotor` (blades + hub count toward the rotor quota), `+ item_status` (`product` | `waste`, input from upstream data, default `product`), `+ has_geometry_model` (needed by open calls).

**Storage hub (pseudo):** `+ licensed_for_waste` (bool). A waste lot may only go to a licensed hub.

**Receiver (pseudo):** `+ kind` (open_call | bridge | noise_barrier | street_furniture | wind_farm | steel | recycler | coprocessing), `+ precedent` (the real project it is modelled on, with a link), `+ stage` and `certainty`, `+ submission_deadline` (open calls), `+ country, needs_whole_blade, needs_approval, approval_months, min_passport_pct, quantity_min, quantity_max`.

**Country table (new, small):** `{ code, landfill_ban: 'law'|'partial'|'none', blade_recycling_domestic: bool, waste_export_regime: 'EU_WSR'|'CH_VeVA', notes, sources }`.

## 6. Open items to verify before the pitch

- [ ] French rule: does co-processing count toward the 35% rotor quota?
- [ ] Germany: 3% vs 5% organic limit; DIN 4866 status
- [ ] Switzerland: exact VVEA article on landfilling blades; VeVA export procedure
- [ ] Spain: Ley 7/2022 landfill tax and its effect on blades
- [ ] Monte Mele and Cers turbine models; Tormoseröd location
- [ ] Truck €/km rates, cutting cost, emission factor (still placeholders)

## Sources

**Alpiq assets**
- [Alpiq: wind power assets](https://www.alpiq.com/energy/assets/wind-power) · [Rocca Rossa](https://www.alpiq.com/energy/assets/wind-power/rocca-rossa-wind-farm) · [Cattolica Eraclea](https://alpiq.com/energy/assets/wind-power/cattolica-eraclea-wind-farm) · [Ennese](https://alpiq.com/energy/assets/wind-power/ennese-wind-farm) · [Roussas-Gravières](https://www.alpiq.com/energy/assets/wind-power/roussas-gravieres-wind-farm) · [Le Peuchapatte](https://www.alpiq.com/energy/assets/wind-power/le-peuchapatte) · [Tormoseröd](https://www.alpiq.com/energy/assets/wind-power/tormoseroed-wind-farm)
- [Availon: 124 MW maintenance contract (G8X / G90 counts)](https://www.engineeringnews.co.za/article/availon-wins-124-mw-wind-farms-maintenance-contract-in-italy-2014-01-09)
- [Gamesa: Ramacca ECO80 maintenance](https://www.windpowerengineering.com/gamesa-maintain-69-mw-wind-complex-italy/)
- [List of wind farms in Switzerland](https://en.wikipedia.org/wiki/List_of_wind_farms_in_Switzerland) · [Alpiq–Fu-Gen Tormoseröd agreement](https://www.alpiq.com/newsroom/media-releases/alpiq-and-fu-gen-enter-into-agreement-for-swedish-wind-farm-tormoseroed)

**Regulation**
- [IEA Wind Task 45, D4.2: Guideline for legislation and policy on end-of-life blade waste](https://zenodo.org/records/11172546) (France Art. 20 text; Dutch BSSA exemptions)
- [Légifrance: arrêté 22 June 2020, Art. 20](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000042064061) · [Bird & Bird summary](https://www.twobirds.com/en/insights/2020/france/france-stronger-environmental-and-recycling-obligations-for-french-wind-farm-operators)
- [Waste Framework Directive 2008/98](https://eur-lex.europa.eu/eli/dir/2008/98/oj/eng) · [Commission guidance on key waste provisions](https://ec.europa.eu/environment/pdf/waste/framework/guidance_doc.pdf) · [Opalis: product or waste?](https://opalis.eu/sites/default/files/2022-02/FCRBE-booklet-04-Product_waste-EN_0.pdf)
- [Waste Shipment Regulation 2024/1157](https://eur-lex.europa.eu/eli/reg/2024/1157/oj/eng) · [Key changes 2026–27](https://www.gaston-schul.com/en/resources/article/new-european-waste-rules-what-businesses-must-prepare-for-in-2026-2027/)
- [Construction Products Regulation 2024/3110](https://eur-lex.europa.eu/eli/reg/2024/3110/oj/eng)
- [WindEurope: landfill ban call](https://windeurope.org/news/wind-industry-calls-for-europe-wide-ban-on-landfilling-turbine-blades/) · [NedZero: self-imposed ban from 1 Jan 2026](https://nedzero.nl/en/news/starting-january-1-2026-the-european-wind-industry-will-implement-a-self-imposed-ban-on-landfilling-wind-turbine-blades-windeuro) · [EurekAlert 2026: no EU ban yet](https://www.eurekalert.org/news-releases/1122301)
- Germany: [Fachagentur Wind und Solar: Rückbau und Recycling](https://www.fachagentur-wind-solar.de/wind/rueckbau-und-recycling) · [BWE information paper 2023](https://www.wind-energie.de/fileadmin/redaktion/dokumente/publikationen-oeffentlich/themen/02-technik-und-netze/09-rueckbau/20230801_BWE-Informationspapier_Rueckbau_und_Recycling_von_Windenergieanlagen.pdf) · [Correctiv fact check](https://correctiv.org/faktencheck/2023/04/20/recycling-von-windraedern-sockel-bleiben-nicht-im-boden-und-rotorblaetter-duerfen-nicht-vergraben-werden/)
- Switzerland: [Keystone-SDA: recycling of wind turbines (BAFU)](https://www.keystone-sda.ch/en/news/communications/article/vom-recycling-von-windenergieanlagen) · [dpa fact check: landfill of blades banned in CH](https://dpa-factchecking.com/switzerland/220809-99-327657/) · [Suisse Eole: recyclability](https://suisse-eole.ch/de/blog/rezyklierbarkeit-von-windanlagen/)
- Denmark: [Miljøstyrelsen 2023: blade volumes and treatment options](https://mst.dk/publikationer/2023/april/kortlaegning-af-maengder-og-behandlingsmuligheder-for-vindmoellevinger) · [Folketing answer 233 (2021–22)](https://www.ft.dk/samling/20211/almdel/kef/spm/233/svar/1874582/2560203/index.htm)
- Spain: [AEE: end-of-life options for blades](https://aeeolica.org/wp-content/uploads/2022/12/AEE-Opciones-de-Fin-de-Vida-de-las-Palas-de-los-Aerogeneradores-v2022-vFinal.pdf) · [Iberdrola: EnergyLOOP](https://www.iberdrola.com/about-us/power/wind-blade-recycling) · [RenerCycle](https://www.energiaestrategica.com/strategicenergy/en/notes/wind-repowering-renercycle)
- Italy: [REGlobal: decommissioning of onshore wind](https://reglobal.org/decommissioning-of-onshore-wind-turbines/)
- Transport: [Oversized load permits in Europe 2026](https://nsroute.com/en/blog/oversized-permits-europe-2026/)

**Receiver precedents (models for the pseudo targets)**
- [Gdańsk University of Technology: open competition for a building made of wind turbine blades](https://wilis.pg.edu.pl/en/redivivus-wind-turbine-blades/architectural-competition)
- [designboom: BladeBridge, Cork greenway](https://www.designboom.com/architecture/repurposed-wind-turbine-blades-bladebridge-ireland-02-15-2022/) · [Re-Wind BladeBridges (Leeds Beckett)](https://eprints.leedsbeckett.ac.uk/id/eprint/9396)
- [MaterialDistrict: Blade-Made noise barrier](https://materialdistrict.com/article/noise-barrier-from-recycled-wind-turbine-blades-unveiled/) · [Science in Poland: blades as road noise barriers](https://scienceinpoland.pl/en/news/news%2C100350%2Cscientists-convert-wind-turbine-blades-road-noise-barriers.html)

**Receivers and market**
- [Holcim/Geocycle Lägerdorf (WindEurope visit)](https://evwind.aeeolica.org/2021/10/06/windeurope-ceo-visits-german-cement-plant-thats-running-on-blade-waste/82688) · [Business in Wind](https://businessinwind.com/) · [Dutchwind](https://dutchwind.com/) · [REI Wind](https://reiwind.ie/wind-turbines-for-sale/) · [Vestas refurbished turbines](https://www.vestas.com/en/energy-solutions/refurbished-turbines) · [Eneco / Business in Wind Rotterdam](https://news.eneco.com/old-wind-turbines-become-railway-sleepers/)
