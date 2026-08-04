# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Maintenance note:** Update this file only when something genuinely changes that future Claude instances would otherwise get wrong — a new package, a renamed command, a shift in the data flow. Do not add information that can be derived by reading the code directly. Keep it concise.

## Project Overview

Real-time bus information website for Lleida, Spain. It scrapes stop/route data from the Moventis API (`https://www.moventis.es/api/json/GetTiemposParada/es/{stopId}/{routeId}/0`), persists it to a PostgreSQL database via Prisma, and serves real-time arrival data on demand through tRPC.

## Monorepo Structure

pnpm + Turborepo monorepo:

- `apps/web` — Next.js 15 frontend (primary app)
- `apps/expo` — React Native app (early stage, just tRPC wiring)
- `packages/api` — tRPC router definitions; all business logic lives here
- `packages/db` — Prisma client singleton + schema
- `packages/shared` — Types, Zod schemas, and constants shared across apps
- `tooling/eslint` / `tooling/typescript` — shared configs

## Commands

All commands run from the monorepo root unless noted.

```bash
pnpm dev          # start all apps (turbo dev)
pnpm build        # build all packages/apps
pnpm lint         # lint all packages/apps
```

Package-specific (run from `packages/db`):
```bash
pnpm db:generate  # prisma generate after schema changes
pnpm db:push      # push schema to DB without migration
pnpm db:studio    # open Prisma Studio
```

`apps/scraper`'s production `start` script also runs `db:push` before launching, so schema changes in `schema.prisma` apply automatically on every deploy — no manual push step needed. It runs without `--accept-data-loss`, so a destructive change (e.g. a column drop/retype) makes the scraper container exit non-zero instead of silently applying — resolve those manually with `pnpm db:push --accept-data-loss` once you've confirmed the loss is intended.

Web app only (from `apps/web`):
```bash
pnpm typecheck    # tsc --noEmit
pnpm check        # lint + typecheck together
pnpm format:write # prettier write
```

## Testing

Vitest, in `packages/api` and `packages/shared` (run from root via Turbo):
```bash
pnpm test       # default suite — deterministic, no network/DB
pnpm test:live  # opt-in Moventis API contract canary (needs DATABASE_URL + internet)
```

The suite is tiered to keep the non-deterministic live API at the edge:
- **Contract layer** (`packages/api/src/lib/schedule-contract.test.ts`) validates recorded fixtures in `packages/api/src/__fixtures__/` against the Zod schemas — answers "did the API shape change?" before any logic test.
- **Logic** tests are pure: `stop-schedule.ts` parsing, `probe.ts`, `bus-locator.ts`, `geo.ts`. `now` is injected so arrival-time math never depends on the wall clock.
- **Mocked-I/O**: `getStopSchedule` with a mocked axios; `buses.byLine` via `createCaller` with a fake `ctx.db` + stubbed `getStopSchedule` (the locator's probe is injected, so `bus-locator.ts` tests stay pure).
- **Live canary** (`*.live.test.ts`, excluded from `pnpm test`) discovers a valid stop/route pair from the DB at runtime so it survives stop/route churn, and asserts only that the live response still parses — never values.

When a live test and a logic test fail together, fix the contract/fixtures first. The pure seams (`parseSchedulesResponse`, `toProbeResult`, `toGeometry`) exist to be tested without HTTP — keep I/O injected.

## Environment Variables

All env vars live in a single `.env` at the monorepo root. Copy `.env.example` to `.env`:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/moventis-lleida"
NEXT_PUBLIC_MAPS_API_KEY=""   # Google Maps JavaScript API key
NEXT_PUBLIC_MAPS_MAP_ID=""    # Google Cloud Map ID (required for AdvancedMarker)
ANDROID_HOME=                 # Android SDK path (Expo only)
```

Turbo loads the root `.env` automatically via `globalDotEnv` in `turbo.json`. Env is validated at startup via `@t3-oss/env-nextjs` in `apps/web/src/env.js`.

## Architecture

### Data Flow

1. **Static data** (routes, stops) — stored in PostgreSQL, fetched once and cached for 1 week via Next.js `unstable_cache` (`packages/api/src/routers/routes.ts`).
2. **Real-time data** (arrival times) — fetched live from Moventis API on each `stops.get` tRPC call, never cached. The stop's `externalId` and its route's `externalId` are the foreign keys into the Moventis API.

### tRPC

Defined in `packages/api`, consumed by both RSC (via `apps/web/src/trpc/server.ts`) and client components (via `apps/web/src/trpc/react.tsx`). Two routers:

- `routes.getAll` — returns all routes from DB (weekly cached)
- `stops.getMany` — filters stops by route codes and/or search query
- `stops.get` — fetches a single stop + live schedules from Moventis API, keyed by `Stop.externalId` (not the internal cuid) because that id is public in the URL
- `stops.getByExternalIds` — bare stops for the saved-stops list. Database-only and includes soft-deleted stops, unlike every other stop query. `stops.get` would fire one live Moventis request per route on the stop, so resolving N saved ids through it would push ~3N calls through the 5 req/s throttle before the map could draw anything.

### Scraper Line Discovery (`apps/scraper`)

The line feed (`/es/moventis/es/lines`) **stopped listing the Lleida zone on 2026-08-02** while every per-line endpoint kept serving Lleida data. Do not treat the feed as the authority on whether the network exists.

`src/lib/discovery.ts` therefore has two sources: the feed (matched by `ID_ZONA === "2"` *and* by `ID_LINEA` against stored routes, so a zone renumber reconnects itself), falling back to the routes already in the database. In fallback mode the calendar is rebuilt by probing `GetTrayectos/{line}/{date}` per day — it returns a bare `[{ numLinea }]` stub on a non-operating date, which makes it a reliable operating-day oracle.

Lines go dormant for a season (line 10 serves nothing in August, resumes in September). `src/lib/resolution.ts` keeps three outcomes apart, and the distinction is load-bearing:
- **resolved** — running, or dormant but alive further out. Keeps stops/geometry; a dormant line reports an empty calendar so the line strip stops claiming it runs today.
- **withdrawn** — every probe answered, none served. Pruning may act on it.
- **unreachable** — a request errored. Blocks pruning entirely.

Pruning is the only destructive step and runs **only on a provably complete run** (`src/lib/prune.ts`). Prisma reads `notIn: []` as *match every row*, so a run that discovers nothing does not prune nothing — it prunes everything. That is what soft-deleted the whole network for three nights in August 2026. Never call `prune()` without `shouldPrune()` approving.

### Real-time Schedule Parsing

`packages/api/src/lib/stop-schedule.ts` handles all Moventis API interaction. The API returns two kinds of arrival data distinguished by `real`:
- `"S"` (real-time): arrival is expressed as a relative offset (`"5 min 30 s"`)
- `"N"` (scheduled): arrival is an absolute clock time (`"14:35"`)

Both are normalized into `Date` objects. The `trayectos` field is a map of journey names to arrival times, where the value can be either an array or an object (handled by the Zod union in `packages/shared/src/schemas/schedule.ts`).

**Every clock time from Moventis is a `Europe/Madrid` wall clock, and servers run in UTC.** Never resolve one with `Date#setHours`/`getHours` or `new Date(y, m, d)` — those read the host's zone and silently shift every scheduled arrival by the offset (+2h in summer). Go through `toWallClock` / `fromWallClock` in `packages/api/src/lib/zoned-time.ts`. The same trap applies to any "today" boundary: `utcStartOfLocalDay` exists because `OperatingDay.date` is stored at midnight UTC but the day it refers to is Lleida's. This class of bug is invisible on a developer machine in Spain and only appears in production.

### Shared Package

`packages/shared` exports:
- `INITIAL_BOUNDS` / `RESTRICTED_BOUNDS` / `COORDINATES` — Lleida map bounds
- `Lines` / `Line` types, `Journey` / `Schedules` types
- `apiScheduleSchema` / `scheduleSchema` — Zod schemas for validating the Moventis API response

### Frontend State

`BusFinderContext` (`apps/web/src/context/buses.tsx`) is the central state manager. It is initialized server-side with routes (avoiding a client round-trip) and handles:
- Selected route filtering (debounced 300ms)
- Stop search query (debounced 300ms)
- Selected stop, held as a `Stop.externalId` (opens a Drawer with `StopDetails`, which fetches the stop itself)

The map renders via `@vis.gl/react-google-maps`. Pins are rendered by `MapPinsRenderer`; clicking a pin calls `selectStop`, which triggers the Drawer.

### Saved Stops (`preferides`)

Per-device favourites in localStorage under `moventis:preferides`, as `{ ids: Stop.externalId[], visible: boolean }` (`apps/web/src/hooks/use-preferides.ts`). Held as ids, not stop records, so renames and soft deletes can't go stale in storage; resolved through `stops.getByExternalIds` on each load.

They appear as one toggleable badge in the line strip and behave like a line with no geometry — but **must never enter `selectedRoutes`**. That array drives per-line stop queries, `useLineBuses`, `StopNavigation`'s variant queries, the drawer's selected/correspondence split and the `?lines=` param; a synthetic code in it breaks all five. `BusFinderContext` plumbs them separately (`preferidesStops` / `preferidesCount` / `showPreferides` / `isPreferida`).

Two consequences worth keeping:
- `preferidesStops` excludes stops a selected line already draws, or the stop gets two `AdvancedMarker`s at identical coordinates. So the star is a per-stop prop in `MapPinsRenderer`, not a property of which list rendered the pin. That renderer also promotes a saved stop one zoom bucket up, because the `small` bucket is a 10px dot with no room for a shoulder mark.
- A soft-deleted stop is normally click-inert, but a saved one stays clickable (`MapPin`'s `clickable`): the drawer holds the only control that can unsave it, and `StopDetailsError` carries that control too, for a stop whose details can no longer load at all.

### URL State

Selection is shareable: `/?lines=1,4&stop=10211`. `lines` is a comma-separated list of route `code`s, `stop` is a `Stop.externalId` — both public ids, chosen over internal cuids so links stay short and survive a database rebuild (the scraper upserts by `externalId`).

`InitialStopFocus` centres the map on the `?stop=` stop once and renders its pin when no selected line already does — without it a bare `?stop=` link opens the drawer over city-wide bounds with nothing on the map behind it.

The flow is one-directional. `apps/web/src/app/page.tsx` reads `searchParams` server-side and seeds `BusFinderProvider` (no `useSearchParams`, so no Suspense boundary and no hydration flash); unknown line codes are filtered out against `routes.getAll`, while an unknown `stop` is left to `stops.get` and surfaces as the drawer's error state. `useUrlSelection` (`apps/web/src/hooks/use-url-selection.ts`) then only ever *writes*, via `window.history.replaceState` — `router.replace` would re-run the server render on every badge tap, and `replaceState` keeps toggles out of the history stack. Nothing reads the URL after mount, so back/forward does not restore a previous selection.

Search query is deliberately not in the URL.

### Database Schema

```
Route  (id, externalId, name, code, color, stops[], operatingDays[])
Stop   (id, externalId, name, latitude, longitude, routes[])
OperatingDay (routeId, date)  ← composite PK
```

`externalId` on both `Route` and `Stop` is what gets passed to the Moventis API. `code` on `Route` is cast to the `Lines` union type at the application layer.

**A client extension in `packages/db/index.ts` injects `deletedAt: null` into every `route.findMany` and `stop.findMany`.** So on those two methods, *omitting* `deletedAt` does not mean "no filter" — it means "live rows only", silently. Writing a query that must see soft-deleted rows takes an explicit `where: { deletedAt: undefined }`, which spreads over the injected `null` and restores "no filter" (verified against the real client, not assumed). Only `findMany` is extended; `count`, `upsert`, `updateMany` and `deleteMany` see everything.

This has bitten twice. `discoverLines` in the scraper is the recovery path that un-deletes the network, and without the override it returned zero routes on the one run that needed it. `stops.getByExternalIds` is **still** affected: it is documented above as including soft-deleted stops, and does not, so a saved stop that gets soft-deleted disappears from the map instead of staying clickable.
