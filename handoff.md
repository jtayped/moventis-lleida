# Handoff — Codebase Issues

Findings from a full four-section parallel code review. Each entry includes the exact file, the current code, and what to change. Ordered by severity within each section.

> **Maintenance note:** Add new issues here only when they are concrete, actionable, and not already covered by `SYSTEM_DESIGN.md`. Do not add stylistic preferences, hypothetical improvements, or issues that are too vague to act on. Remove entries as they are resolved. This file should shrink over time, not grow.

---

## 1. Critical Bugs

### 1.1 `selectStop.name` renders the function name instead of the stop name

**File:** `apps/web/src/context/buses.tsx:127–129`

**Current:**
```tsx
<DrawerTitle className="sr-only">{selectStop.name}</DrawerTitle>
<DrawerDescription className="sr-only">
  hores d&apos;arribada per la parada {selectStop.name}
</DrawerDescription>
```

`selectStop` is the setter function defined at line 93, not the `selectedStop` state variable. Every function in JavaScript has a read-only `.name` property equal to its declared identifier, so both strings silently render `"selectStop"` instead of the actual stop name. The `{selectedStop && ...}` guard above guarantees `selectedStop` is defined at this point.

**Fix:**
```tsx
<DrawerTitle className="sr-only">{selectedStop.name}</DrawerTitle>
<DrawerDescription className="sr-only">
  hores d&apos;arribada per la parada {selectedStop.name}
</DrawerDescription>
```

This is also an accessibility bug — screen readers announce `"selectStop"` on every drawer open.

---

### 1.2 Real-time arrival offset arithmetic is broken near day boundaries

**File:** `packages/api/src/lib/stop-schedule.ts:53–55`

**Current:**
```ts
arrivalDate.setHours(now.getHours() + hours);
arrivalDate.setMinutes(now.getMinutes() + minutes);
arrivalDate.setSeconds(now.getSeconds() + seconds);
```

`setHours`, `setMinutes`, and `setSeconds` operate independently on the same object with no carry-over logic between fields. `setHours(23 + 1)` silently wraps back to `00:xx` of the **same calendar day** instead of advancing to the next day. A bus due at 00:05 when the current time is 23:58 would therefore appear to be 25 hours in the past.

**Fix — replace all three lines with:**
```ts
const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
return new Date(now.getTime() + totalMs);
```

---

### 1.3 `stops.get` queries only `routes[0]` — multi-route stops return incomplete schedules

**File:** `packages/api/src/routers/stops.ts:57–61`

**Current:**
```ts
const schedules = await getStopSchedule(
  stop.externalId,
  stop.routes[0]!.externalId,
);
```

The Moventis API endpoint is per-route (`/es/{stopId}/{routeId}/0`). A stop that appears on routes L2 and L4 returns only L2's data.

**Fix — call the API for every route and merge results:**
```ts
const scheduleResults = await Promise.all(
  stop.routes.map((route) =>
    getStopSchedule(stop.externalId, route.externalId),
  ),
);
const schedules = scheduleResults
  .filter((s): s is NonNullable<typeof s> => s !== null)
  .flat();
```

---

### 1.4 `CountdownTimer` interval is never cleared — counts into negative infinity

**File:** `apps/web/src/components/ui/countdown.tsx:14–22`

**Current:**
```tsx
const interval = setInterval(() => {
  setSecondsRemaining((prevSeconds) => prevSeconds - 1);
}, 1000);
```

No `clearInterval` is called when `secondsRemaining` reaches zero. The component keeps re-rendering every second forever and always shows `"Now"`.

**Fix:**
```tsx
useEffect(() => {
  if (secondsRemaining <= 0) return;
  const interval = setInterval(() => {
    setSecondsRemaining((prev) => {
      if (prev <= 1) {
        clearInterval(interval);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  return () => clearInterval(interval);
}, [secondsRemaining <= 0]); // only re-registers when crossing zero
```

---

## 2. High-Priority Bugs

### 2.1 Scheduled-time "day wrap" compares against a different `now` reference

**File:** `packages/api/src/lib/stop-schedule.ts:62–80`

**Current:**
```ts
const now = new Date(); // line 41 — captured once

// ...later in parseArrivalTime:
const arrivalDate = new Date(); // fresh Date — NOT the same as `now`
arrivalDate.setHours(hours, minutes, 0, 0);

if (arrivalDate < now) {
  arrivalDate.setDate(arrivalDate.getDate() + 1);
}
```

Two separate `new Date()` calls can straddle a millisecond boundary. More critically, if the bus is due exactly at the current hour and minute, `arrivalDate` has `0` milliseconds while `now` has non-zero milliseconds, making `arrivalDate < now` true even though the bus is due "right now" — causing it to be shown as tomorrow.

**Fix — pass `now` as a parameter to `parseArrivalTime`:**
```ts
function parseArrivalTime(scheduleDetails: ApiJourneyDetail, now: Date): Date {
  if (scheduleDetails.real === "S") {
    // ... existing real-time logic using now.getTime() + totalMs
  } else {
    const arrivalDate = new Date(now); // copy, not a fresh Date
    arrivalDate.setHours(hours, minutes, 0, 0);
    if (arrivalDate.getTime() < now.getTime()) {
      arrivalDate.setDate(arrivalDate.getDate() + 1);
    }
    return arrivalDate;
  }
}
```

---

### 2.2 Past arrivals are rendered as `"arribant"`

**File:** `apps/web/src/components/map/stop-details/arrival-time-item.tsx:20–21`

**Current:**
```tsx
const diffInSeconds = Math.round(
  (journey.arrivalTime.getTime() - Date.now()) / 1000,
);
```

This value is computed once at render and never updated. `formatRelativeTime` treats any value `< 30` as `"arribant"`, which includes all negative values — so a bus that left 20 minutes ago still reads as arriving.

**Fix — filter past arrivals before rendering, and refresh `diffInSeconds` via an interval for non-closest cards:**
```tsx
// In stop-details/index.tsx — filter before passing to render:
const futureScheduledTimes = journey.scheduledTimes.filter(
  (t) => t.arrivalTime.getTime() > Date.now(),
);

// In arrival-time-item.tsx — use a live value:
const [diffInSeconds, setDiffInSeconds] = useState(() =>
  Math.round((journey.arrivalTime.getTime() - Date.now()) / 1000),
);
useEffect(() => {
  const id = setInterval(() => {
    setDiffInSeconds(Math.round((journey.arrivalTime.getTime() - Date.now()) / 1000));
  }, 30_000);
  return () => clearInterval(id);
}, [journey.arrivalTime]);
```

---

### 2.3 Soft-delete fields are defined but never filtered — "deleted" rows appear in every query

**File:** `packages/db/prisma/schema.prisma:26, 51`

Both `Route` and `Stop` have `deletedAt DateTime?`, but no Prisma middleware or `$extends` adds `where: { deletedAt: null }`. Every `findMany` across the codebase returns soft-deleted records.

**Fix — add a Prisma Client extension in `packages/db/index.ts`:**
```ts
const createPrismaClient = () =>
  new PrismaClient({ ... }).$extends({
    query: {
      route: {
        async findMany({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
      stop: {
        async findMany({ args, query }) {
          args.where = { deletedAt: null, ...args.where };
          return query(args);
        },
      },
    },
  });
```

Or switch to hard deletes — the `onDelete: Cascade` on `OperatingDay` already handles cascading, and hard deletes are simpler to reason about at this scale.

---

### 2.4 Wrong import alias in `packages/api`

**File:** `packages/api/src/routers/routes.ts:1`

**Current:**
```ts
import type { Lines } from "@/types/lines";
```

The `@/` alias resolves to `apps/web/src/` in the web app's tsconfig. `packages/api` has no such alias and has no `src/types/lines.ts`. This compiles only because Next.js injects the web app's tsconfig paths at build time — a fragile, implicit coupling.

**Fix:**
```ts
import type { Lines } from "@moventis/shared";
```

This matches what `stops.ts` already does correctly.

---

## 3. Medium-Priority Bugs

### 3.1 `unstable_cache` wrapper is recreated on every tRPC request

**File:** `packages/api/src/routers/routes.ts:7–25`

**Current:**
```ts
getAll: publicProcedure.query(async ({ ctx }) => {
  const getCachedRoutes = unstable_cache(
    async () => {
      const data = await ctx.db.route.findMany({});
      // ...
    },
    ["all-bus-routes"],
    { revalidate: 60 * 60 * 24 * 7 },
  );
  const routes = await getCachedRoutes();
  return routes;
}),
```

The cached function wrapper is rebuilt on every incoming request, capturing a per-request `ctx.db` reference inside a long-lived cached closure.

**Fix — hoist to module scope using the db singleton:**
```ts
import { db } from "@moventis/db";
import type { Lines } from "@moventis/shared";

const getCachedRoutes = unstable_cache(
  async () => {
    const data = await db.route.findMany({ where: { deletedAt: null } });
    return data.map((route) => ({ ...route, code: route.code as Lines }));
  },
  ["all-bus-routes"],
  { revalidate: 60 * 60 * 24 * 7 },
);

export const routesRouter = createTRPCRouter({
  getAll: publicProcedure.query(() => getCachedRoutes()),
});
```

---

### 3.2 `stops.getMany` fires a network request on every page load with empty inputs

**File:** `apps/web/src/context/buses.tsx:74–79`

**Current:**
```ts
const { data: stops, isLoading: isLoadingStops } = api.stops.getMany.useQuery({
  routeCodes: debouncedSelectedRoutes,
  query: debouncedQuery,
});
```

On initial render both inputs are empty. The server returns `[]` immediately, but the round-trip fires unconditionally.

**Fix:**
```ts
const { data: stops, isLoading: isLoadingStops } = api.stops.getMany.useQuery(
  { routeCodes: debouncedSelectedRoutes, query: debouncedQuery },
  {
    enabled:
      debouncedSelectedRoutes.length > 0 || debouncedQuery.trim().length > 0,
  },
);
```

---

### 3.3 `getStopSchedule` swallows all errors silently

**File:** `packages/api/src/lib/stop-schedule.ts:235–254`

**Current:**
```ts
} catch (error) {
  handleError(error); // logs to console, discards
  return null;
}
```

A Zod parse failure (API schema changed) is indistinguishable from a healthy stop with no upcoming buses — both return `null`. The caller in `stops.get` returns `schedules: null` to the client with no explanation.

**Fix — differentiate error classes:**
```ts
} catch (error) {
  if (error instanceof z.ZodError) {
    // Schema contract broken — not a transient fault
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Moventis API response shape changed.",
      cause: error,
    });
  }
  if (error instanceof AxiosError) {
    console.error(`Moventis API network error: ${error.message}`);
    return null; // transient — return null so UI shows empty state
  }
  console.error("Unexpected error in getStopSchedule:", error);
  return null;
}
```

---

### 3.4 `mapId="lleida"` is not a real Google Cloud Map ID

**File:** `apps/web/src/components/map/index.tsx:24`

**Current:**
```tsx
<MapComponent mapId="lleida" ...>
```

`mapId` must be a UUID-format identifier configured in Google Cloud Console. It is required for `AdvancedMarker` to render correctly in production. The string `"lleida"` is not valid.

**Fix — add to env vars:**
```
# apps/web/.env
NEXT_PUBLIC_MAPS_MAP_ID="your-cloud-map-id-here"
```

```ts
// apps/web/src/env.js
client: {
  NEXT_PUBLIC_MAPS_API_KEY: z.string(),
  NEXT_PUBLIC_MAPS_MAP_ID: z.string(),
},
```

```tsx
<MapComponent mapId={env.NEXT_PUBLIC_MAPS_MAP_ID} ...>
```

---

### 3.5 Redundant dead-code status check after `axios.get`

**File:** `packages/api/src/lib/stop-schedule.ts:99–104`

**Current:**
```ts
const res = await axios.get(url);

if (res.status !== 200) {
  throw new AxiosError("The schedule API returned a non-200 status.", res.status.toString());
}
```

Axios throws automatically on any non-2xx response. This block is unreachable dead code.

**Fix — delete lines 100–104.** If you genuinely need to handle non-error HTTP codes like 204, configure `validateStatus` on the axios call explicitly.

---

## 4. Type Safety

### 4.1 `selected: 0 | 1` in Zod schema vs `boolean` in `Schedule` interface

**File:** `packages/shared/src/schemas/schedule.ts:42`, `packages/shared/src/types/schedule.ts:6`

**Current schema:**
```ts
selected: z.union([z.literal(0), z.literal(1)]),
```
**Current interface:**
```ts
selected: boolean;
```

The Zod-inferred type is `0 | 1` but the hand-written type uses `boolean`. No transform bridges them.

**Fix — add a transform to the schema:**
```ts
selected: z.union([z.literal(0), z.literal(1)]).transform((v) => v === 1),
```

---

### 4.2 `Schedule` interface is not exported

**File:** `packages/shared/src/types/schedule.ts:11`

**Current:**
```ts
interface Schedule { ... }
export type Schedules = Schedule[];
```

Consumers can only reference the element type via the awkward `Schedules[number]`.

**Fix:**
```ts
export interface Schedule { ... }
```

---

### 4.3 `route.code as Lines` cast has no runtime guard

**File:** `packages/api/src/routers/routes.ts:12`, `packages/api/src/routers/stops.ts:64`

**Current:**
```ts
code: route.code as Lines,
```

If the database contains a `code` value not in the `LINES` tuple, `LINE_COLORS[route.code]` silently returns `undefined`.

**Fix — add a guard at the DB boundary:**
```ts
import { LINES } from "@moventis/shared";

function toLine(route: Route): Line {
  if (!LINES.includes(route.code as Lines)) {
    throw new Error(`Unknown route code in DB: "${route.code}"`);
  }
  return { ...route, code: route.code as Lines };
}
```

---

### 4.4 `adaptada` is typed `z.unknown().nullable()` — contributes no type safety

**File:** `packages/shared/src/schemas/schedule.ts:6`

**Current:**
```ts
adaptada: z.unknown().nullable(),
```

If `adaptada` is always `null` in the current API, use `z.null()`. If it has a known shape (accessibility data), type it explicitly. As written it accepts anything silently.

---

## 5. Database Schema

### 5.1 `OperatingDay.date` should be `@db.Date`, not `DateTime`

**File:** `packages/db/prisma/schema.prisma:30`

**Current:**
```prisma
date DateTime
```

`DateTime` maps to PostgreSQL `TIMESTAMP WITH TIME ZONE`. An operating day is a calendar date; storing it as a timestamp makes the composite PK `[routeId, date]` timezone-sensitive.

**Fix:**
```prisma
date DateTime @db.Date
```

---

### 5.2 Implicit M2M join table cannot carry stop ordering

**File:** `packages/db/prisma/schema.prisma:21, 47`

The auto-generated `_RouteToStop` table has no `order` column. For displaying route paths or ordered stop lists, this is a structural limitation.

**Fix — convert to an explicit join model:**
```prisma
model RouteStop {
  routeId String
  stopId  String
  order   Int

  route Route @relation(fields: [routeId], references: [id], onDelete: Cascade)
  stop  Stop  @relation(fields: [stopId], references: [id], onDelete: Cascade)

  @@id([routeId, stopId])
  @@index([routeId, order])
}
```

Remove the implicit `stops Stop[]` / `routes Route[]` fields and replace with `RouteStop[]` on each model.

---

### 5.3 `Route.code` is unconstrained `String` at the DB level

**File:** `packages/db/prisma/schema.prisma:18`

Any string is accepted; invalid codes pass silently through to the TypeScript cast layer.

**Fix — define a Prisma enum:**
```prisma
enum LineCode {
  L1
  L2
  L3
  // ...
}

model Route {
  code LineCode
  // ...
}
```

Or if the code values are not valid Prisma enum identifiers (e.g. `"n1"`), add a raw SQL `CHECK` constraint in a migration:
```sql
ALTER TABLE "Route" ADD CONSTRAINT "route_code_valid"
CHECK (code IN ('1','2','3','4','5','6','7','8','9','10','20','70','n1','16'));
```

---

### 5.4 Missing index on `OperatingDay.date` for date-based lookups

**File:** `packages/db/prisma/schema.prisma:35`

**Current:**
```prisma
@@id([routeId, date])
```

The composite PK index is efficient for `WHERE routeId = ? AND date = ?`, but not for "which routes operate on date X" queries.

**Fix:**
```prisma
@@id([routeId, date])
@@index([date])
```

---

## 6. Performance

### 6.1 `MapPinsRenderer` is not memoized

**File:** `apps/web/src/components/map/pins/pins-renderer.tsx:16`

`MapPin` is `React.memo`'d but its parent is not. Any `BusFinderContext` update (typing in search, toggling a route) re-renders `MapPinsRenderer` and forces React to re-evaluate every child memo.

**Fix:**
```tsx
const MapPinsRenderer = React.memo(({ stops }: { stops: Stop[] }) => {
  // ...
});
```

---

### 6.2 All pins re-evaluate `isSelected` on every stop selection

**File:** `apps/web/src/components/map/pins/pins-renderer.tsx:62`

When `selectedStopId` changes every pin receives a new `isSelected` prop value. With hundreds of stops this is a synchronous evaluation pass on every click.

**Fix — move the read inside `MapPin` using a context selector, or pass `selectedStopId` and compute inside the memoized child:**
```tsx
// pins-renderer.tsx — pass selectedStopId once
<MapPin
  key={stop.id}
  stop={stop}
  selectedStopId={selectedStopId}
  onClick={handlePinClick}
/>

// pin.tsx — compute isSelected inside the memo
const isSelected = stop.id === selectedStopId;
```

This way `React.memo` can use a custom equality check that skips re-render when neither `stop` nor `selectedStopId` changes.

---

### 6.3 Route sort runs on every render without memoization

**File:** `apps/web/src/components/map/tools/routes.tsx:12–18`

**Current:**
```tsx
const sortedRoutes = [...routes].sort((a, b) => { ... });
```

**Fix:**
```tsx
const sortedRoutes = useMemo(
  () => [...routes].sort((a, b) => { ... }),
  [routes, selectedRoutes],
);
```

---

### 6.4 `closestScheduledTime` never recalculates against the live clock

**File:** `apps/web/src/components/map/stop-details/index.tsx:30–51`

The "closest" time is computed once at fetch time. After the drawer is open for a few minutes the highlighted card is stale.

**Fix — add a periodic refresh:**
```tsx
const [now, setNow] = useState(() => Date.now());
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 30_000);
  return () => clearInterval(id);
}, []);

const closestScheduledTime = useMemo(() => {
  // ... existing logic, but use `now` instead of `Date.now()`
}, [details, now]);
```

---

## 7. Accessibility & UX

### 7.1 Stop pins have no `title` — not keyboard-accessible

**File:** `apps/web/src/components/map/pins/pin.tsx`

The small-bucket branch (`pins < 10`) renders an `AdvancedMarker` with no `title` prop. Google Maps adds markers to the tab order only when `title` is set.

**Fix — add `title={stop.name}` to all three render branches consistently.**

---

### 7.2 `ClockAlert` icon has no label — invisible to screen readers

**File:** `apps/web/src/components/map/stop-details/arrival-time-item.tsx:32–33`

**Current:**
```tsx
{!journey.isRealTime && <ClockAlert size={12} className="ml-1" />}
```

**Fix:**
```tsx
{!journey.isRealTime && (
  <ClockAlert
    size={12}
    className="ml-1"
    aria-label="Hora estimada (no en temps real)"
    role="img"
  />
)}
```

Also add a visible tooltip or legend somewhere in the UI explaining the icon.

---

### 7.3 Drawer has no visible close button

**File:** `apps/web/src/context/buses.tsx:124–135`

Drag-to-close and `Escape` are non-obvious, especially on desktop.

**Fix — add a `DrawerClose` button inside `StopDetailsHeader`:**
```tsx
import { DrawerClose } from "@/components/ui/drawer";
import { X } from "lucide-react";

// In the header:
<DrawerClose asChild>
  <Button variant="ghost" size="icon" aria-label="Tanca">
    <X className="h-4 w-4" />
  </Button>
</DrawerClose>
```

---

### 7.4 Fake progress bar in the stop details skeleton

**File:** `apps/web/src/components/map/stop-details/loading.tsx:7–15`

A `setInterval` increments progress on a fixed timer completely unrelated to actual fetch state. It stalls at 90% and never reaches 100%.

**Fix — replace with an indeterminate skeleton or spinner:**
```tsx
const StopDetailsSkeleton = () => (
  <div className="mt-4 flex flex-col gap-4 p-4 md:mx-auto md:w-lg">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);
```

---

### 7.5 "correspondències" shown even when no routes are selected

**File:** `apps/web/src/components/map/stop-details/index.tsx:53–71`

When `selectedRoutes` is empty, every line falls into `otherLines` and is labelled as a "transfer" even though there is no primary selection.

**Fix:**
```tsx
const showSections = selectedRoutes.length > 0;

{showSections ? (
  <>
    {/* selected / other sections */}
  </>
) : (
  <div className="divide-y divide-gray-300">
    {details.schedules.map((line) => (
      <StopScheduleLine key={line.externalLineId} line={line} closestScheduledTime={closestScheduledTime} />
    ))}
  </div>
)}
```

---

## 8. Code Quality

### 8.1 `console.log` in `timingMiddleware` fires unconditionally in production

**File:** `packages/api/src/trpc.ts:94`

**Current:**
```ts
console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
```

**Fix:**
```ts
if (t._config.isDev) {
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
}
```

---

### 8.2 Two identical debounce `useEffect`s — extract a `useDebounce` hook

**File:** `apps/web/src/context/buses.tsx:44–64`

**Fix — create `apps/web/src/hooks/use-debounce.ts`:**
```ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

**Replace in `buses.tsx`:**
```ts
const debouncedQuery = useDebounce(searchQuery);
const debouncedSelectedRoutes = useDebounce(selectedRoutes);
```

Eliminates four state variables and two effects.

---

### 8.3 `selectedStop` not cleared when its route is deselected

**File:** `apps/web/src/context/buses.tsx`

If a user selects a stop then toggles off the route it belongs to, the drawer stays open showing a stop no longer on the map.

**Fix:**
```ts
function toggleRoute(routeCode: Lines) {
  setSelectedRoutes((current) =>
    current.includes(routeCode)
      ? current.filter((id) => id !== routeCode)
      : [...current, routeCode],
  );
  setSelectedStop(undefined);
}
```

---

### 8.4 `interface` declared inside a function body

**File:** `packages/api/src/lib/stop-schedule.ts:174`

**Current:**
```ts
interface ScheduledTime { arrivalTime: Date; isRealTime: boolean };
```

Flagged by most linters (`no-inner-declarations`). The type already exists as `Journey["scheduledTimes"][number]`.

**Fix:**
```ts
type ScheduledTime = Journey["scheduledTimes"][number];
```

Or inline the type annotation directly.

---

### 8.5 `export * from "@prisma/client"` leaks the entire Prisma namespace

**File:** `packages/db/index.ts:19`

Re-exporting the entire Prisma client namespace gives consumers internal utility types they don't need.

**Fix — export only what consumers actually use:**
```ts
export type { Route, Stop, OperatingDay } from "@prisma/client";
```

---

### 8.6 Stray `key` prop on a non-list element

**File:** `apps/web/src/components/map/stop-details/line-schedule.tsx:21`

**Current:**
```tsx
<div key={line.externalLineId} className="py-3">
```

This `<div>` is the root element of `StopScheduleLine`. `key` on a component's own root is ignored by React — keys only apply to elements in an iterator. The correct `key` is already on the `<StopScheduleLine>` call sites in `index.tsx`. Remove the stray `key`.

---

### 8.7 `lastUpdated.tsx` has a redundant `setDisplayTime` call in `useEffect`

**File:** `apps/web/src/components/map/stop-details/last-updated.tsx:8–16`

**Current:**
```tsx
const [displayTime, setDisplayTime] = useState(formatTimeAgo(timestamp));

useEffect(() => {
  setDisplayTime(formatTimeAgo(timestamp)); // redundant — useState already did this
  const id = setInterval(() => setDisplayTime(formatTimeAgo(timestamp)), 1000);
  return () => clearInterval(id);
}, [timestamp]);
```

**Fix:**
```tsx
const [displayTime, setDisplayTime] = useState(() => formatTimeAgo(timestamp));

useEffect(() => {
  const id = setInterval(() => setDisplayTime(formatTimeAgo(timestamp)), 1000);
  return () => clearInterval(id);
}, [timestamp]);
```

---

### 8.8 `scheduleSchema` has no fallback for unknown `real` values

**File:** `packages/shared/src/schemas/schedule.ts:22–25`

If the Moventis API ever returns a `real` value other than `"S"` or `"N"`, `z.discriminatedUnion` throws a hard parse error and `getStopSchedule` returns `null` for the entire stop — silently. Add a comment documenting this as an intentional strict boundary, or add a passthrough arm:

```ts
// Intentionally strict: unknown `real` values throw to surface API contract changes early.
export const scheduleSchema = z.discriminatedUnion("real", [
  realTimeScheduleSchema,
  scheduledTimeSchema,
]);
```

---

### 8.9 `Line` type exposes Prisma relation fields that are `undefined` at runtime in DTO contexts

**File:** `packages/shared/src/types/lines.ts:5`

**Current:**
```ts
export type Line = Omit<Route, "code"> & { code: Lines };
```

`Route` includes `stops`, `operatingDays` — relation fields that are `undefined` unless explicitly included in the Prisma query. TypeScript says they exist; at runtime they may not.

**Fix — define an explicit DTO:**
```ts
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

---

### 8.10 `RESTRICTED_BOUNDS` padding value is undocumented

**File:** `packages/shared/src/constants/lleida.ts:13`

**Current:**
```ts
const padding = 0.035;
```

`0.035°` is approximately 3.9 km latitude / 2.7 km longitude at Lleida's position. Add a comment:
```ts
// ~3.9 km buffer so users can pan slightly outside the city boundary
const padding = 0.035;
```
