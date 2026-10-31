# Reuse Matching Map — Web App Plan

Oct 31, 2026 · builds on [reuse-matching-map-handover.md](reuse-matching-map-handover.md) and [reuse-rules-and-data.md](reuse-rules-and-data.md)

> **Update (built version):** after the first test, the layout changed to one screen with no page scroll:
> wind farms on the left (expand a farm → its components; click a component → its routes on the map),
> the map in the centre (click a marker, route line or legend entry → floating card), and on the right
> the top 3 plans (recommended / lowest risk / cheapest transport) with embodied energy kept, cost, net CO₂,
> delivery certainty and a computed "why this plan". The RREUSE-style filter panel was dropped.
> Code: `src/reuse/` (ReuseApp, FarmList, ReuseMap, MapCard, PlanPanel; rules in match.ts and allocate.ts).

## Reference: RREUSE network map

[rreuse.org/our-network/network-map](https://www.rreuse.org/our-network/network-map) is a map-plus-directory of 3,152 reuse, repair and recycling social enterprises. What it does:

| Element | RREUSE | Take for us? |
|---|---|---|
| Filter panel on the side | Free-text search + multi-selects: **Country**, **Activity** (Reuse / Repair / Recycling / Others), **Product stream** (13 streams, e.g. Electrical & Electronic Devices, Construction & Demolition materials, Photovoltaic panels), **Location type** (Headquarters / Industrial location / Shop / Others), checkbox "Direct RREUSE members"; buttons **Filter** and **Clear** | Yes: same four filter groups, adapted to our domain (below) |
| Result count | "3152 results", updates with filters | Yes: count of visible donors and receivers |
| Map | Google Maps with marker clustering | Map yes; **Leaflet** + markercluster instead (no API key, works offline with a bundled outline) |
| Views | **Grid / List** toggle | Yes: map + list side by side; list can be cards or a dense table |
| Card | Name, 2-line description, address, "Read more" → detail page | Yes: our cards add the numbers that matter (model, quantity, stage, needed by) |
| Filter state | Bound to form state, applied with a button | Better: apply instantly and **put it in the URL**, so a demo state can be bookmarked |

**What RREUSE does not do, and we must add:** RREUSE is a directory, so every location is equal and nothing connects. Our map is **directional**: donors (wind farms) send lots through hubs to receivers, and the receivers are ranked. So we keep the RREUSE explorer as the first mode and add a second mode where you pick a lot and see its ranked routes.

## Two modes, one screen

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Reuse Matching Map                  [Explore | Match]     PSEUDO DATA ⓘ  │
├──────────────┬──────────────────────────────────────┬─────────────────────┤
│ FILTERS      │                                      │ LIST / DETAIL       │
│ 🔍 search    │            map of Europe             │ 37 results          │
│ Year ●──── │   ● wind farm   ■ hub   ▲ receiver   │ ┌─────────────────┐ │
│ Country ▾    │   (clustered when zoomed out)        │ │ card            │ │
│ Route ▾      │                                      │ └─────────────────┘ │
│ Item ▾       │   Match mode: leg 1 dashed,          │ ┌─────────────────┐ │
│ Loc. type ▾  │   leg 2 solid, coloured by rank      │ │ card            │ │
│ Stage ▾      │                                      │ └─────────────────┘ │
│ ☐ flagged    │                                      │                     │
│ [Clear]      │  legend                              │                     │
└──────────────┴──────────────────────────────────────┴─────────────────────┘
```

On a phone the three columns stack: filters collapse into a "Filters (3)" button, and the list becomes a bottom sheet over the map.

### Mode 1: Explore (the RREUSE part)

Browse everything, filter, click a marker or card to open its detail.

**Filters (our versions of RREUSE's groups)**

| RREUSE | Ours | Values |
|---|---|---|
| Search | Search | Name, model, municipality |
| Country | Country | IT, FR, CH, SE + receiver countries |
| Activity | **Route** (waste-hierarchy tier) | Reuse as-is · Repurpose · Recycle · Recover |
| Product stream | **Item** | Rotor blades · Structural steel · Electrical components · Whole turbine |
| Location type | **Location type** | Wind farm · Storage hub · Open call · Infrastructure project · Other wind farm · Factory · Recycler · Co-processing |
| Direct members ☐ | **Flagged only** ☐ | Farms inside the planning window for the chosen year |
| — | **Stage** (receivers) | Announced · Call open · Selected/tendered · Contracted |
| — | **Year** slider | 2026–2040: moves the flags and greys out receivers whose `needed_by` has passed |

Filters work like RREUSE: OR within a group, AND across groups. Each option shows its count, e.g. "Open call (2)", so empty combinations are visible before you click.

**Cards**

- *Wind farm:* name · country · model × count · in service year · flag year · lot chips `Blades 126 · Steel · Electrical` · Alpiq share if < 100%
- *Receiver:* name · kind icon · stage badge · needs (e.g. "2 whole blades 30–45 m, grade A") · needed by · "modelled on: BladeBridge Cork ↗" · `PSEUDO` tag
- *Hub:* name · accepts · capacity used/free

### Mode 2: Match (what RREUSE doesn't do)

You get here by clicking a lot chip on a farm card (or "Match" in its detail panel).

1. **Lot header:** farm, item, quantity, grade, passport %, item status (product/waste, from data).
2. **Controls appear** in the filter column: Whole / Segmented (blades), weight sliders (timing, condition, CO₂, cost, certainty), "show excluded".
3. **Map:** other markers fade. Only the hub and candidate receivers stay, with route lines.
4. **List** becomes the ranked plan:
   - **Allocation bar** on top: `6 bridge · 40 noise barrier · 80 recycler (fallback)`.
   - **Compliance strip** for French farms: `Rotor mass in tiers 1–3: 38% ≥ 35% ✔`.
   - **Route cards** in rank order, grouped by tier, each with score, units, km, CO₂, cost, certainty, and law/policy badges.
   - **Excluded** (collapsed): each with its reason, e.g. "Blade 32 m < 40 m required", "Needs whole blade", "Deadline before availability".
5. **Click a route card** to open the breakdown: both legs (km, trucks, permits), transport CO₂, cost, avoided CO₂, net benefit, and every score term with its weight.
6. **Sign-off:** "Propose plan" (junior) → "Sign off" (senior). Blocked with a reason if the compliance check fails or if a co-owner approval is missing (Cers, Tormoseröd).

Going back to Explore keeps the filters. Signed plans show a ✔ on the farm marker.

## URL state (deep links, like RREUSE detail pages)

```
#/explore?country=IT,FR&item=blade&flagged=1&year=2031
#/match/rocca-rossa/blade?seg=0&w=1,1,1,1,1&route=R4
```

Every demo step can be bookmarked, and a reload doesn't lose state.

## Code structure

The matching rules are the core, so they live apart from the UI and can be reused when this page is combined with the rest of the app.

```
src/reuse/
  data.ts          types + loads public/reuse/*.json
  geo.ts           haversine, road factor, nearest hub
  match.ts         filterReceivers, scoreRoutes, rankLot  (pure functions)
  allocate.ts      allocateLot (greedy by tier → score → capacity, fallback), checkCompliance
  match.test.ts    checks for the demo cases
  ReuseMap.tsx     Leaflet map, clusters, route lines, legend
  FilterPanel.tsx  RREUSE-style filters + counts
  ResultList.tsx   cards (explore) / ranked plan (match)
  RouteDetail.tsx  breakdown + sign-off
public/reuse/
  farms.json  lots.json  hubs.json  receivers.json  params.json  countries.json
```

**Main API of the matching module (no React, no DOM)**

```ts
rankLot(lot, ctx): { routes: Route[]; excluded: Exclusion[] }
allocateLot(lot, routes, ctx): Allocation        // units per route + fallback
checkCompliance(farm, allocations): Check[]      // French quota, co-owner, fallback present
// ctx = { year, segmented, weights, hubs, receivers, params, countries }
```

The UI only calls these three functions and draws the result. The same functions can later take real lots from the sensor/maintenance pipeline.

## Build order

1. Pseudo dataset (the 8 Alpiq farms with real public specs; ~12 pseudo receivers; 3 pseudo hubs; params with every assumption labelled)
2. `match.ts` + `allocate.ts` + checks for the demo cases:
   - Roussas V66 blades excluded from the bridge (too short)
   - Segmenting removes the bridge and the open call, and the noise barrier takes over
   - Roussas plan sent only to co-processing → fails the French quota
   - Cers → sign-off blocked until co-owner approval
3. Explore mode: map + clusters + filters + cards + URL state
4. Match mode: route lines, ranked plan, allocation bar, breakdown
5. Sign-off and compliance strip
6. Phone layout, pseudo-data labels everywhere, walkthrough rehearsal

## Decisions

- **Map library:** Leaflet with OpenStreetMap tiles, plus a bundled low-detail Europe outline as an offline fallback. RREUSE's Google Maps needs an API key and a network connection.
- **List view:** cards in Explore, the ranked plan in Match. A dense table view (RREUSE's "list") is optional and comes last.
- **Filter apply:** instant, no "Filter" button.
