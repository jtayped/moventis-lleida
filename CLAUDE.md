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

Web app only (from `apps/web`):
```bash
pnpm typecheck    # tsc --noEmit
pnpm check        # lint + typecheck together
pnpm format:write # prettier write
```

## Environment Variables

All env vars live in a single `.env` at the monorepo root. Copy `.env.example` to `.env`:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/moventis-lleida"
NEXT_PUBLIC_MAPS_API_KEY=""   # Google Maps JavaScript API key
NEXT_PUBLIC_MAPS_MAP_ID=""    # Google Cloud Map ID (required for AdvancedMarker)
ANDROID_HOME=                 # Android SDK path (Expo only)
```

`scripts/dev.cjs` loads the root `.env` into `process.env` before running turbo, so all apps receive the vars automatically. Env is validated at startup via `@t3-oss/env-nextjs` in `apps/web/src/env.js`.

## Architecture

### Data Flow

1. **Static data** (routes, stops) — stored in PostgreSQL, fetched once and cached for 1 week via Next.js `unstable_cache` (`packages/api/src/routers/routes.ts`).
2. **Real-time data** (arrival times) — fetched live from Moventis API on each `stops.get` tRPC call, never cached. The stop's `externalId` and its route's `externalId` are the foreign keys into the Moventis API.

### tRPC

Defined in `packages/api`, consumed by both RSC (via `apps/web/src/trpc/server.ts`) and client components (via `apps/web/src/trpc/react.tsx`). Two routers:

- `routes.getAll` — returns all routes from DB (weekly cached)
- `stops.getMany` — filters stops by route codes and/or search query
- `stops.get` — fetches a single stop + live schedules from Moventis API

### Real-time Schedule Parsing

`packages/api/src/lib/stop-schedule.ts` handles all Moventis API interaction. The API returns two kinds of arrival data distinguished by `real`:
- `"S"` (real-time): arrival is expressed as a relative offset (`"5 min 30 s"`)
- `"N"` (scheduled): arrival is an absolute clock time (`"14:35"`)

Both are normalized into `Date` objects. The `trayectos` field is a map of journey names to arrival times, where the value can be either an array or an object (handled by the Zod union in `packages/shared/src/schemas/schedule.ts`).

### Shared Package

`packages/shared` exports:
- `LINES` — tuple of valid line code strings (`"1"–"10"`, `"16"`, `"20"`, `"70"`, `"n1"`)
- `LINE_COLORS` — hex color per line
- `INITIAL_BOUNDS` / `RESTRICTED_BOUNDS` / `COORDINATES` — Lleida map bounds
- `Lines` / `Line` types, `Journey` / `Schedules` types
- `apiScheduleSchema` / `scheduleSchema` — Zod schemas for validating the Moventis API response

### Frontend State

`BusFinderContext` (`apps/web/src/context/buses.tsx`) is the central state manager. It is initialized server-side with routes (avoiding a client round-trip) and handles:
- Selected route filtering (debounced 300ms)
- Stop search query (debounced 300ms)
- Selected stop (opens a Drawer with `StopDetails`)

The map renders via `@vis.gl/react-google-maps`. Pins are rendered by `MapPinsRenderer`; clicking a pin calls `selectStop`, which triggers the Drawer.

### Database Schema

```
Route  (id, externalId, name, code, color, stops[], operatingDays[])
Stop   (id, externalId, name, latitude, longitude, routes[])
OperatingDay (routeId, date)  ← composite PK
```

`externalId` on both `Route` and `Stop` is what gets passed to the Moventis API. `code` on `Route` is cast to the `Lines` union type at the application layer.
