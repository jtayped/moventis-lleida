import { loadFixture } from "../../__fixtures__/load";
import { parseSchedulesResponse } from "../stop-schedule";
import { toProbeResult } from "../probe";
import { normalizeText } from "../stop-schedule";
import type { LocatorVariant, ProbeFn } from "../bus-locator";

/**
 * A recorded full-line snapshot (`__fixtures__/line-*-snapshot.json`): one real
 * response per stop of the line, captured a few hundred milliseconds apart.
 * Replays as a probe against the capture's own clock, so the test is exact and
 * offline. Test-only.
 */
export interface LineSnapshot {
  capturedAt: string;
  routeCode: string;
  routeExternalId: string;
  variants: { direction: string; description: string; stops: string[] }[];
  stops: Record<string, { name: string; lat: number; lng: number; fetchedAt: string; body: unknown }>;
}

export function snapshotWorld(name: string): {
  snapshot: LineSnapshot;
  variants: LocatorVariant[];
  probe: ProbeFn;
  calls: string[];
} {
  const snapshot = loadFixture(name) as LineSnapshot;
  const now = new Date(snapshot.capturedAt).getTime();
  const variants: LocatorVariant[] = snapshot.variants.map((v) => ({
    direction: v.direction === "V" ? "V" : "I",
    description: normalizeText(v.description),
    geometry: null,
    stops: v.stops.map((externalId) => {
      const s = snapshot.stops[externalId]!;
      return { id: `id-${externalId}`, externalId, lat: s.lat, lng: s.lng };
    }),
  }));
  const calls: string[] = [];
  const probe: ProbeFn = (externalId) => {
    calls.push(externalId);
    const s = snapshot.stops[externalId];
    if (!s) return Promise.resolve(null);
    const schedules = parseSchedulesResponse(s.body, new Date(s.fetchedAt));
    return Promise.resolve(toProbeResult(schedules, snapshot.routeExternalId, now));
  };
  return { snapshot, variants, probe, calls };
}
