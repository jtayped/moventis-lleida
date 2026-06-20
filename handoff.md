# Handoff — Live Bus Tracking (line-level redesign)

Feature branch: `feat/bus-position-prediction`

> **This plan supersedes the original per-stop prediction plan.** That first version shipped and
> works (back-projection from the *open stop's* ETAs), but it has a fatal UX flaw: bus markers only
> appear while a stop **drawer** is open, and the drawer (a bottom sheet) covers most of the
> viewport — so the user can't actually see the buses it predicts. This redesign **decouples bus
> display from the drawer**: live buses render on the open map whenever a **line is selected**.
>
> Decisions locked with the user (2026-06-19):
> 1. **Show live buses for every *selected* line** (each in its line colour), not just when exactly
>    one line is selected.
> 2. **Fully replace** the per-stop prediction trigger with the line-level one (one code path).
> 3. **Two-probe self-calibration** for placement accuracy (derive each line's real speed from the
>    API instead of a fixed guessed speed).

---

## 1. Why this is feasible (validated against the live API, 2026-06-19, 17:00)

The worry was cost: lines 7 and n1 are long (~34–38 stops per variant; ~70 across both directions).
Probing every stop would be far too many calls. **It isn't necessary.** Empirical probe results
(`GetTiemposParada/es/{stop}/{route}/0`, counting `real:"S"` arrivals for the line's own `idLinea`):

| Line | externalId | Variants | Terminal probe | Midpoint probe |
|---|---|---|---|---|
| **7** | 135 | I: 34 stops, V: 38 | I→**5** (ETAs 17→67 min), V→5(+) | 5 / 0 |
| **1** (loop) | 129 | 1: 14 stops | **0** (loop terminal quirk) | **5** |
| **2** | 130 | 2 variants (~28) | **5** each | 5 |
| **n1** (night) | 717 | 2: 34 stops | **0** (night bus — not running daytime) | 0 |

**Key facts learned:**

- **One probe of a variant's destination terminal returns up to ~5 buses whose ETAs span the whole
  route** (e.g. 17→67 min ⇒ one bus near the end, one near the start). Back-projecting those ETAs
  spreads buses across the entire line. **Cost is per-variant, not per-stop** — a 70-stop line costs
  the same as a 14-stop one.
- **The API caps at ~5 `real:"S"` arrivals per journey.** So we can show at most ~5 buses per
  direction (the 5 nearest to the terminal). Fine for Lleida headways; document the limit.
- **Loop terminals can return 0** (line 1: the turnaround stop reports nothing, but a midpoint
  reports 5). Need a loop fallback to a midpoint anchor.
- **Night lines (n1) report nothing during the day** — correct behaviour, render nothing.

**Net cost per line: ~2–3 probes per variant (terminal + 1 calibration anchor, +1 loop fallback),
so ~2–6 calls per line per refresh, independent of stop count.** With per-request caching of shared
stops (e.g. line 7's "mangraners" is terminal of V *and* first of I) it's often fewer.

---

## 2. What already exists and is REUSED (do not rebuild)

The first implementation left clean, tested primitives. Keep them:

- **`packages/shared/src/lib/geo.ts`** — pure polyline math: `cumulativeArcLengths`,
  `projectToPolyline`, `pointAtArc`, `distanceMeters`, `flattenPaths`. Tested. **Reuse as-is.**
- **`packages/shared/src/{schemas,types}/bus-position.ts`** — the `BusPosition` DTO + Zod schema.
  **Extend** it with a `lineCode` field (needed now that multiple lines render at once — the marker
  must know which line's colour to use). Validate before sending over the wire.
- **`packages/api/src/lib/bus-locator.ts`** — the **back-projection** core. Its `backProject()` places
  a bus `etaSeconds × speed` of arc back from an anchor stop along the geometry, wraps on closed
  loops, clamps on linear routes, and returns `{lat,lng,fromIdx,toIdx,fraction,confidence}`. Its
  `matchVariant()` (exact + diacritic-folded) maps an API journey key to a stored variant. **Reuse
  and generalise** (see §4): the anchor becomes the *terminal*, not the user's stop, and the speed
  becomes a *calibrated per-variant value*, not the fixed `AVG_SPEED_MPS`.
- **`packages/api/src/lib/probe.ts`** — `toProbeResult(schedules, routeExtId, now)` reduces a stop's
  schedule to per-journey real-time ETAs (filters `real:"S"`, drops past). `toGeometry()` parses
  variant geometry. **Reuse both.**
- **`packages/api/src/lib/stop-schedule.ts`** — `getStopSchedule` / `parseSchedulesResponse` /
  `normalizeText`. **Reuse.**
- **`apps/web/.../bus-markers-renderer.tsx`** — the distinct **white "live vehicle" pill** marker
  (green pulsing live-dot + halo, line-coloured border) that reads as a moving bus, not a stop pin.
  **Reuse**; it already takes `positions/lineCode/color`. Will be driven by the aggregated multi-line
  positions.
- **`apps/web/.../stop-details/live-bus-status.tsx`** — the drawer status row (searching / N live /
  none / error). **Reuse**, but feed it from the line-level positions filtered to the open stop's line.
- **The journey↔variant match rule** (validated earlier): match the API `trayectos` key to
  `RouteVariant.description` via `normalizeText` + diacritic-folded fallback. **Terminal-stop-name
  matching does NOT work** (destinations are area names, not stop names). Keep using `matchVariant`.

### What is REMOVED / changed

- **`apps/web/src/hooks/use-bus-positions.ts`** (the stop-coupled async-generator consumer) — remove;
  replaced by a per-selected-line query hook (§5).
- **`packages/api/src/routers/buses.ts` `locate`** — replace the `{stopId, routeCode}` stop-anchored
  generator with a `{routeCode}` line-anchored query (§4). The user-stop fetch/`userArrivals` path
  goes away.
- **`BusFinderContext`** — `busPositions`/`busStatus`/`singleLine` (single-line, stop-gated) become a
  multi-line aggregation gated only on `selectedRoutes` (§5).
- The `locateBuses` generator's `userArrivals`/`userStopExternalId` inputs are replaced by terminal
  anchoring; `MAX_BUSES_PER_JOURNEY` becomes "API returns ≤5" naturally.

---

## 3. New behaviour (the goal)

When the user selects one or more lines, the map shows that line's **live buses** (`real:"S"` only)
as moving-vehicle markers, **without needing a stop drawer open**. Markers refresh on an interval
(~25 s) while the line stays selected. Selecting a stop is now orthogonal — the drawer still shows
the timetable and a "N autobusos en directe" status, but it no longer *gates* the buses.

### Constraints retained

- **Real-time only** (`real:"S"`); never place `real:"N"` scheduled times.
- **Timetable independence** — `stops.get` stays fast/unchanged; a failing bus query never affects it.
- **Bounded cost** — anchor on terminals (≤2–3 probes/variant), cache shared stops per request,
  refresh on a timer, only for *selected* lines.

---

## 4. Server: line-level locator + calibration

### 4.1 New procedure — `buses.byLine`

`packages/api/src/routers/buses.ts`:

- `byLine: publicProcedure.input(z.object({ routeCode: z.string() })).query(...) → BusPosition[]`
  (a **plain query**, not a generator — calibration needs ≥2 probes before placing, and the client
  refetches on an interval; streaming per-bus adds no value here).
- Load the route + variants (ordered stops with `id/externalId/lat/lng`, `geometry`, `direction`,
  `description`) exactly as the old `locate` did.
- For **each variant**, run the locator (§4.2); concatenate results. Tag each `BusPosition` with
  `lineCode = input.routeCode`. Validate each with `busPositionSchema` before returning.
- Per-request cache: wrap `getStopSchedule` in a `Map` keyed by `${stopExtId}:${routeExtId}` so a
  stop shared between variants is fetched once.

### 4.2 Per-variant locator (`packages/api/src/lib/bus-locator.ts`, generalised)

Ordered stops `S = [s₀ … s_{n-1}]`, destination terminal `s_{n-1}`. Let `arc(i)` = arc-length of
`sᵢ` projected onto the variant polyline (via `projectToPolyline`); `total` = polyline length;
`loop` = `isClosedLoop(polyline)`.

**Step A — choose the anchor and read buses.**
1. Primary anchor `A = n-1` (terminal). Probe `s_{n-1}`; via `toProbeResult` + `matchVariant`, take
   journey `J`'s real-time ETAs `E = [e₀<e₁<…]` (each a bus *heading to the terminal*).
2. If `E` is empty **and** `loop` → set `A = floor(n/2)` (midpoint) and re-probe (handles the line-1
   loop-terminal-returns-0 quirk; loops wrap correctly in back-projection).
3. If still empty → this variant has no live buses; yield nothing.

**Step B — calibrate speed (two-probe).**
- Pick a **calibration anchor** `A₂` upstream of `A` (e.g. `floor(n/2)` when `A` is the terminal; if
  `A` is already the midpoint, use `floor(n/4)`). Probe it → ETAs `E₂` for journey `J`.
- Buses appearing at `A₂` are a subset of those at `A` (only the ones upstream of `A₂`). For a bus in
  both, `eta_A − eta_{A₂} = T(A₂→A)`, a constant. Pair `A₂`'s buses with `A`'s largest-ETA buses
  (sorted ascending, align tails); take the **median** difference `T`.
- `speed_v = arcBetween(A₂, A) / T`, where `arcBetween = |arc(A) − arc(A₂)|` (use the wrapped arc on
  loops). Sanity-clamp `speed_v` to e.g. `[1.5, 12]` m/s; on too-few matches or nonsense, fall back to
  the existing `AVG_SPEED_MPS` constant (≈4 m/s) → mark those positions `confidence:"medium"`.

**Step C — place each bus (reuse `backProject`, generalised).**
- For each `eᵢ` in `E` (buses at anchor `A`): target arc = `arc(A) − eᵢ × speed_v`; on `loop`,
  `((targetArc % total) + total) % total`; else `max(0, targetArc)`. `pointAtArc` → lat/lng;
  `segmentAtArc` → `{fromIdx,toIdx,fraction}`.
- `confidence`: `"high"` when calibrated + geometry present; `"medium"` when fixed-speed fallback or
  no geometry; `"low"` when clamped at origin (linear, ETA predates route start).
- Emit `BusPosition { journeyName: J, direction, lat, lng, segment, fraction, etaSeconds: eᵢ,
  confidence, lineCode }`. **`etaSeconds` now means "ETA to the terminal,"** not to a user stop —
  rename the doc comment accordingly (the field is still just "seconds until this bus reaches its
  reference anchor"; keep it for the marker tooltip / future use).

**Probes per variant:** terminal + calibration (+ loop fallback) = **2–3**, cached.

### 4.3 Tests (`bus-locator.test.ts`, rewrite/extend — all pure, faked probe)

- Calibration: two synthetic anchors with a known segment time ⇒ recovered `speed_v` within ε;
  median rejects an outlier bus.
- Placement on a linear variant: terminal anchor, several ETAs ⇒ buses spread at expected segments;
  far bus (ETA > route time) clamps to origin `confidence:"low"`.
- Loop variant: terminal returns empty ⇒ midpoint fallback used; large ETA wraps onto the closing
  segment (no pile-up at origin — the bug this whole effort fixed).
- Fallbacks: <2 matched buses ⇒ `AVG_SPEED_MPS`, `confidence:"medium"`; geometry null ⇒ straight
  stop-lines.
- `matchVariant` exact + diacritic-folded (kept from current suite).
- Contract/fixture + mocked-`getStopSchedule` tiers (`schedule-contract`, `get-stop-schedule`,
  `probe`, `stop-schedule` tests) are unaffected — keep green.

---

## 5. Frontend: decouple from the drawer, render all selected lines

### 5.1 Data hook — `apps/web/src/hooks/use-line-buses.ts` (replaces `use-bus-positions.ts`)

- Use `api.useQueries` over `selectedRoutes` (the **raw** selection, mirroring the existing
  `routeQueries` pattern in `context/buses.tsx`): one `buses.byLine({ routeCode })` per selected line.
- `refetchInterval: 25_000`, `refetchOnWindowFocus: true`, `enabled: selectedRoutes.length > 0`.
  Stagger is unnecessary at this volume.
- Aggregate: flatten all results into `BusPosition[]` (each already carries `lineCode`). Expose a
  per-line status map (`loading | done | error`) for the drawer indicator.

### 5.2 Context — `BusFinderContext`

- Replace `busPositions` (single line) with the aggregated multi-line `BusPosition[]`, and
  `busStatus`/`singleLine` with a `lineBusStatus: Record<Lines, "loading"|"done"|"error">`.
- Call `useLineBuses(selectedRoutes)` here (single source of truth; map + drawer both read it).
- **Gating changes: no longer requires `selectedStop` or `selectedRoutes.length === 1`.** Any
  selected line predicts.

### 5.3 Map — `apps/web/src/components/map/index.tsx`

- Render `<BusMarkersRenderer positions={...} />` for the aggregated positions whenever
  `busPositions.length > 0`, regardless of drawer state. Group by `lineCode` (or pass each marker its
  colour) so each line's buses use that line's colour (`routes.find(r => r.code === pos.lineCode)?.color`).
- `BusMarkersRenderer` already keys uniquely and styles the distinct white pill; just feed it the
  full set and resolve colour per `pos.lineCode`.

### 5.4 Drawer — `stop-details/*`

- `LiveBusStatus` now derives from the aggregated positions filtered to **this stop's selected line(s)**
  (count of live buses on the line), or simply the per-line status. It no longer owns a stream.
- Remove the old `singleLine && !deletedAt` gate that referenced the stop-coupled hook.

### 5.5 UX / a11y

- Marker tooltip Catalan: `"Bus línia {code} — posició aproximada"` (+ "(poc precisa)" for
  low/medium confidence). Existing copy is fine.
- Loading: subtle; never blocks the timetable. Night/no-bus lines simply render no markers (+ the
  drawer's "cap autobús en directe ara mateix").
- Consider a small map legend/ް note that positions are approximate.

---

## 6. Failure modes & handling

| # | Mode | Handling |
|---|------|----------|
| 1 | Loop terminal returns 0 (line 1) | Fallback to midpoint anchor when `isClosedLoop` and terminal empty. |
| 2 | API caps at ~5 buses/journey | Accept; show the ~5 nearest-to-terminal. Document limit. |
| 3 | Night line (n1) — all `real:"N"` | Render nothing. Never place scheduled times. |
| 4 | Calibration: <2 matchable buses / nonsense speed | Clamp speed; else fall back to `AVG_SPEED_MPS`, `confidence:"medium"`. |
| 5 | Journey↔variant string mismatch | `matchVariant` (description + diacritic-fold); log & skip unmatched sub-variants. |
| 6 | Shared terminal lists 2 journeys (line 7 "mangraners" → 10) | Filter probe result to the variant's own journey `J`; per-request cache the fetch. |
| 7 | Far bus (ETA > route traversal) on linear line | Clamp at origin, `confidence:"low"`. On loops, wrap. |
| 8 | Geometry missing | Back-project along straight stop-lines; `confidence:"medium"`. |
| 9 | Probe network failure | `getStopSchedule` returns null → treat variant/anchor as no-data; never break the line query or the timetable. |
| 10 | Many lines selected → many calls | Cost = Σ variants × ~2–3, every 25 s. Acceptable; optional future cap or viewport-gating (§8). |
| 11 | Clock/latency skew | One `now` per request; ETAs relative to server `now`. |

---

## 7. Implementation order

1. **`packages/shared`** — add `lineCode: string` to `BusPosition` type + Zod schema; re-export.
2. **`packages/api/src/lib/bus-locator.ts`** — generalise: terminal/midpoint anchor selection,
   two-probe `calibrateSpeed()`, anchor-based `backProject`. Keep `matchVariant`, `isClosedLoop`,
   `segmentAtArc`. Update unit tests (§4.3).
3. **`packages/api/src/routers/buses.ts`** — replace `locate` with `byLine` query; per-request cache;
   tag `lineCode`; validate. Update `buses.test.ts` (fake `ctx.db` + stubbed `getStopSchedule`:
   linear two-variant line, loop fallback, night→empty).
4. **`apps/web`** — `use-line-buses.ts` (replace `use-bus-positions.ts`); rewire `BusFinderContext`;
   update `map/index.tsx` to render aggregated positions colour-per-line; update `LiveBusStatus`;
   delete dead stop-coupled paths.
5. **Verify** — `pnpm test`, `tsc --noEmit` (api + web), `pnpm lint`; then live-drive in the browser:
   select line 7 (and a second line) **without** opening a stop → distinct coloured pills spread
   along each route; select line 1 (loop) → buses spread, none piled at the terminal; select n1 →
   none (daytime). Confirm markers refresh after ~25 s.

---

## 8. Out of scope (for now)

- Continuous background tracking / workers / sockets — still on-demand (interval refetch only while a
  line is selected).
- Showing >5 buses/direction (API-capped) or buses beyond the terminal's arrival window.
- Predicting `real:"N"` scheduled times.
- Viewport-gated refresh or a hard cap on simultaneously-tracked lines (revisit if many-line
  selection proves heavy).
- Multi-snapshot temporal smoothing of positions.

---

## 9. Testing checklist

- [ ] `BusPosition.lineCode` added (type + schema + exports).
- [ ] Locator: calibration recovers known speed (+ outlier rejection); linear spread; loop
      midpoint-fallback + wrap (no origin pile-up); fixed-speed & no-geometry fallbacks; `matchVariant`.
- [ ] `buses.byLine` router test (fake db + stubbed schedule): two-variant linear, loop fallback,
      night→[], shared-terminal journey filtering, per-request cache (one fetch for a shared stop).
- [ ] Contract/fixture + mocked-I/O tiers stay green.
- [ ] `apps/web` typecheck + repo lint clean.
- [ ] Manual (daytime): line 7 + a second line, no drawer → coloured pills along both routes;
      line 1 loop → spread not piled; n1 → none; markers refresh ~25 s; opening a stop still shows
      the timetable + "N autobusos en directe".
