# System Design

Design principles, architectural standards, and patterns to follow when extending this codebase. Every decision below is grounded in existing code structure; sections marked **improvement** indicate places where the codebase must be brought into conformance.

> **Maintenance note:** This document is a stable standard, not a living changelog. Do not add new sections or modify existing ones unless a genuinely new category of functionality requires it (e.g. authentication, a new data source, a second platform). Do not update it to document every micro-decision or to reflect stylistic preferences — those belong in code review or `handoff.md`. When in doubt, leave it as-is.

---

## 1. Monorepo Boundaries

The repo is a pnpm + Turborepo workspace. Package responsibilities are fixed:

| Package | Responsibility | May import from |
|---|---|---|
| `packages/db` | Prisma client singleton, model types | nothing internal |
| `packages/shared` | Types, Zod schemas, constants | `packages/db` (types only) |
| `packages/api` | tRPC routers, all business logic | `packages/db`, `packages/shared` |
| `apps/web` | Next.js UI, tRPC client | `packages/api`, `packages/db`, `packages/shared` |
| `apps/expo` | React Native UI, tRPC client | `packages/api`, `packages/shared` |
| `tooling/*` | ESLint + TypeScript configs | nothing internal |

**Rules:**
- `packages/api` must never import from `apps/*`.
- `packages/shared` must never contain server-only code (no Prisma queries, no axios calls).
- Path aliases (`@/`) are scoped to the app that defines them. Cross-package imports always use the workspace package name (e.g. `@moventis/shared`), never a relative path or a foreign app's alias.
- **Improvement:** Remove `import type { Lines } from "@/types/lines"` from `packages/api/src/routers/routes.ts` — use `@moventis/shared` instead.

---

## 2. Data Layer

### 2.1 Database Schema

- All user-facing entities carry `createdAt`, `updatedAt`, and `deletedAt`.
- `deletedAt` is only used if a Prisma Client extension globally filters `{ deletedAt: null }` on all model reads. Without that filter, soft-delete must not be used — hard delete is preferable to silent data leakage.
- Calendar-date columns (e.g. `OperatingDay.date`) use `@db.Date`, not `DateTime`. `DateTime` maps to `TIMESTAMP WITH TIME ZONE` in PostgreSQL; a date without a time component should never be stored that way.
- Many-to-many relations that require ordering or additional metadata use an explicit join model, not Prisma's implicit M2M. The `Route ↔ Stop` relation should become an explicit `RouteStop` model with an `order Int` column.
- String columns that represent a fixed enum set (e.g. `Route.code`) must either use a Prisma `enum` type or be protected by a SQL `CHECK` constraint in a migration. Unconstrained `String` columns with an application-layer cast are not acceptable.

### 2.2 Prisma Client

- The singleton in `packages/db/index.ts` is the only place a `PrismaClient` is instantiated. Never import `PrismaClient` directly anywhere else.
- The singleton must include a `$extends` block that applies `where: { deletedAt: null }` to all reads on soft-deletable models.
- `export * from "@prisma/client"` is replaced with explicit named exports (`Route`, `Stop`, `OperatingDay`) to prevent the entire Prisma namespace from leaking.

### 2.3 Type DTOs

Prisma model types expose relation fields (`stops[]`, `operatingDays[]`) that are `undefined` at runtime unless the query includes them. Never use a raw Prisma type as a DTO sent over tRPC.

Define explicit DTO types in `packages/shared`:
```ts
// packages/shared/src/types/lines.ts
export type Line = {
  id: string;
  externalId: string;
  name: string;
  code: Lines;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
```

The rule: if a type crosses a package boundary or is serialized over the wire, it must be an explicit DTO — not an inferred Prisma type.

---

## 3. API Layer (tRPC)

### 3.1 Router Structure

- All tRPC routers live in `packages/api/src/routers/`. One file per domain entity.
- New routers are registered in `packages/api/src/root.ts`.
- Procedures are always `publicProcedure` unless authentication is added (at which point a separate `protectedProcedure` is defined in `trpc.ts`).

### 3.2 Caching

Static data (routes, stops) is cached with `unstable_cache` from `next/cache`. Rules:
- The `unstable_cache` wrapper is always defined at **module scope**, not inside the procedure handler. Defining it inside the handler recreates the wrapper on every request.
- The cached function uses the global `db` singleton directly, not `ctx.db`, so it does not close over a per-request object.
- Cache tags follow the pattern `["entity-name"]` (e.g. `["all-bus-routes"]`).
- Real-time data (arrival schedules) is **never cached** — it is always fetched live from the Moventis API.

### 3.3 External API Integration

All interaction with the Moventis API is contained in `packages/api/src/lib/stop-schedule.ts`. The public contract of that module is the single exported function `getStopSchedule`.

**Error handling within `getStopSchedule`:**
- `z.ZodError` (schema contract broken) → rethrow as `TRPCError` with code `"INTERNAL_SERVER_ERROR"`. This is not a transient fault; it surfaces a change in the upstream API.
- `AxiosError` (network failure) → log to console, return `null`. The UI shows an empty/error state.
- Unknown errors → log to console, return `null`.
- Never use a single catch-all that makes different failure modes indistinguishable.

**Multi-route stops:** `getStopSchedule` is called once per route and results are merged with `Promise.all`. Never call it with only `routes[0]` when a stop may belong to multiple routes.

### 3.4 Validation at the API Boundary

Every piece of data entering the system from an external source (the Moventis API, user input) is validated with a Zod schema. The schemas live in `packages/shared/src/schemas/`.

- Zod schemas are the canonical representation of external data shapes.
- After parsing, data is immediately transformed into internal types. No raw parsed objects flow further than the function that parses them.
- The `selected: z.union([z.literal(0), z.literal(1)])` field must include `.transform(v => v === 1)` so the inferred type matches the `Schedule` interface (`boolean`, not `0 | 1`).
- `z.unknown()` is only acceptable during initial exploration of an undocumented API field. Once the shape is confirmed it must be typed explicitly.

### 3.5 Type Casting

`as Lines` is the only permitted cast from `String` to a union type, and it must be preceded by a runtime guard:

```ts
if (!LINES.includes(code as Lines)) {
  throw new Error(`Unknown route code: "${code}"`);
}
return code as Lines;
```

Naked `as` casts without a guard are a code smell and will be rejected in review.

---

## 4. Shared Package

### 4.1 Exports

`packages/shared/index.ts` uses `export type *` for type-only modules and `export *` for modules containing runtime values:

```ts
// values
export * from "./src/constants/lines";
export * from "./src/constants/lleida";
export * from "./src/schemas/schedule";

// types only
export type * from "./src/types/lines";
export type * from "./src/types/schedule";
```

### 4.2 Constants

- `LINES` is the single source of truth for valid line codes. `LINE_COLORS` is typed `Record<Lines, string>`, which enforces completeness at compile time.
- When adding a new line: add its code to `LINES`, its color to `LINE_COLORS`, and update any SQL `CHECK` constraint on `Route.code`. All three must be updated together.
- Geo constants (`INITIAL_BOUNDS`, `RESTRICTED_BOUNDS`) must include a comment documenting the real-world meaning of padding values.

### 4.3 Zod Schemas

- Schemas in `packages/shared` validate external API responses. They are the contract between the Moventis API and this codebase.
- Discriminated unions (`z.discriminatedUnion`) are the preferred pattern for fields like `real: "S" | "N"` because they produce better error messages and more precise TypeScript types than `z.union`.
- Any field typed `z.unknown()` must have a TODO comment with a tracking date.

---

## 5. Frontend Architecture

### 5.1 Data Fetching Strategy

The app uses a two-tier fetching strategy:

| Data | Where fetched | Caching |
|---|---|---|
| Routes (static) | RSC in `page.tsx` | Next.js `unstable_cache`, 1 week |
| Stops (semi-static, filtered) | Client via tRPC `useQuery` | TanStack Query, 30 s stale |
| Stop schedules (real-time) | Client via tRPC `useQuery` on stop selection | No cache (`staleTime: 0`) |

**Rules:**
- Static data that can be fetched once and cached is always fetched in an RSC and passed as props — never re-fetched on the client.
- Client queries that depend on user state (selected routes, search query) use the `enabled` option to suppress unnecessary network requests:
  ```ts
  enabled: debouncedSelectedRoutes.length > 0 || debouncedQuery.trim().length > 0
  ```
- Real-time queries (`stops.get`) set `staleTime: 0` and `refetchInterval` appropriate to the update frequency of the underlying data (suggest 30 s for arrival times).

### 5.2 State Management

All bus-finder state lives in `BusFinderContext` (`apps/web/src/context/buses.tsx`). The context exposes a typed interface; consumers use `useBusFinder()` and never access the raw context object.

**Debouncing:** Input values that trigger network requests are debounced via a `useDebounce` hook (`apps/web/src/hooks/use-debounce.ts`). The hook encapsulates the `useEffect`/`setTimeout` pattern; it must not be inlined. The delay is 300 ms unless there is a specific reason to change it.

**State consistency:** When a user action would make the currently selected stop invalid (e.g. toggling off its route), `selectedStop` is cleared immediately inside the action handler — not lazily on the next render.

### 5.3 Component Rules

**Memoization:**
- List-rendered components are wrapped in `React.memo`.
- Expensive computations inside components are wrapped in `useMemo` with correct dependency arrays.
- Stable callbacks passed to memoized children are wrapped in `useCallback`.
- The sorting of route buttons in `BusRoutes` is memoized on `[routes, selectedRoutes]`.

**Key props:** `key` belongs on the JSX element returned by `.map()` at the call site, not on the root element inside the component definition. A `key` on a component's own root element is silently ignored.

**Client/server split:**
- Components that use hooks, browser APIs, or context are `"use client"`.
- Components that are pure server-fetched data displays are RSCs by default (no directive needed).
- The pattern is: RSC fetches and passes data → client component owns interactivity.

### 5.4 Environment Variables

All environment variables are declared and validated in `apps/web/src/env.js` using `@t3-oss/env-nextjs`. New variables must be:
1. Added to the `server` or `client` section of `createEnv`.
2. Added to `runtimeEnv`.
3. Added to `apps/web/.env.example` with a placeholder value and a comment.

Never access `process.env` directly in application code outside `env.js`.

**Current required variables:**
```
DATABASE_URL           — PostgreSQL connection string
NEXT_PUBLIC_MAPS_API_KEY — Google Maps JavaScript API key
NEXT_PUBLIC_MAPS_MAP_ID  — Google Cloud Map ID (required for AdvancedMarker)
```

---

## 6. Error Handling

### 6.1 Failure Mode Taxonomy

| Error origin | Expected handling |
|---|---|
| Moventis API network failure | Return `null` from `getStopSchedule`; UI shows error state with retry button |
| Moventis API schema change (Zod failure) | Throw `TRPCError` `INTERNAL_SERVER_ERROR`; surfaces in UI as error state |
| DB not found | Throw `TRPCError` `NOT_FOUND`; handled at the call site |
| Invalid user input | Zod schema on the procedure input; tRPC returns a typed `zodError` |
| Unknown runtime error | Log to console, do not swallow silently |

### 6.2 UI Error States

Every data-fetching component (stop details, stop list, schedule line) must handle three states: loading, error, and success. No component may silently render nothing when data is unavailable — the user must see a message and, where applicable, a retry action.

Loading states use `Skeleton` components — not animated progress bars with fake timers.

### 6.3 No Silent Swallowing

A `catch` block that only calls `console.error` and returns `null`/`undefined` is acceptable only for recoverable network failures where the UI has a defined empty/error fallback. It is never acceptable for:
- Zod parse failures (indicates upstream API contract change)
- DB errors
- Logic errors (errors that should never happen)

---

## 7. Accessibility

Every interactive element meets the following baseline:

- **Keyboard accessible:** All clickable elements are reachable via `Tab` and activatable via `Enter`/`Space`. Map pins must include `title={stop.name}` for `AdvancedMarker` to add them to the tab order.
- **Screen reader labels:** Icon-only buttons and purely visual indicators have `aria-label` or `role="img"` with a text description. The `ClockAlert` icon (estimated time indicator) must have `aria-label="Hora estimada"`.
- **Dialog/Drawer semantics:** Every `Drawer` has a `DrawerTitle` and `DrawerDescription` with correct content (not a function name). A visible close button (`DrawerClose`) is always present.
- **Language:** The app is in Catalan (`lang="ca"`). `aria-label` values, visible labels, and user-facing copy are all in Catalan.

---

## 8. Realtime Data Patterns

The Moventis API provides two arrival data modes, distinguished by the `real` field:

| `real` value | Meaning | Format |
|---|---|---|
| `"S"` | GPS-tracked real-time position | Relative offset: `"5 min 30 s"` |
| `"N"` | Published timetable | Absolute clock time: `"14:35"` |

**Parsing rules:**
- Real-time offsets are added to `Date.now()` as total milliseconds — never via successive `setHours`/`setMinutes`/`setSeconds` calls.
- Scheduled times use a single `now` reference captured once per request for both construction and the day-wrap comparison.
- The day-wrap check adds 24 hours only when `arrivalDate` is strictly before `now` — meaning the bus has already passed and must be due the next calendar day.

**UI display rules:**
- Past arrivals (where `arrivalTime < now`) are filtered out before rendering.
- The countdown for the next upcoming arrival uses `CountdownTimer` and clears its interval when `secondsRemaining` reaches zero.
- Non-countdown times refresh their displayed text on a 30-second interval to prevent stale relative times.
- The closest upcoming arrival is recalculated on a periodic clock tick (30 s) so the highlighted card remains accurate when the drawer is left open.
- Real-time vs scheduled is surfaced with an icon (`ClockAlert` for estimated) with an accessible label. A visible legend explains the distinction.

---

## 9. Code Style

### Naming
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Hooks: `camelCase` prefixed with `use`
- Utilities: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE` for values exported from `packages/shared`; `camelCase` for local constants

### Comments
Comments explain **why**, not what. Acceptable comment subjects:
- A non-obvious constraint from the external API (e.g. why `trayectos` values can be either arrays or objects)
- A workaround for a specific upstream behaviour
- A magic number's real-world meaning (e.g. the 0.035° map padding)

Never comment what the code already says clearly through naming.

### TypeScript
- Prefer `type` imports (`import type { X }`) wherever no runtime value is used.
- Type-only barrel exports use `export type *`.
- `interface` declarations belong at module scope, never inside a function body.
- `as` type casts are preceded by a runtime guard or a comment explaining why the guard is unnecessary.

### Hooks
- Custom hooks live in `apps/web/src/hooks/`.
- Every hook that sets up a `setInterval` or `setTimeout` returns a cleanup function from its `useEffect`.
- State that drives network requests is debounced via `useDebounce` before being passed to `useQuery`.
