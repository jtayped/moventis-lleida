import { describe, expect, it } from "vitest";
import {
  locateLineBuses,
  matchVariant,
  type LocatorVariant,
  type ProbeFn,
} from "./bus-locator";
import { distanceMeters, type LngLat } from "@moventis/shared";

const AVG_SPEED_MPS = 4; // fallback constant mirrored from bus-locator.ts

// ─── A straight (linear, open) line: 12 stops evenly spaced along a parallel ───
const LAT = 41.6;
const N = 12;
const LNG_STEP = 0.00288; // ≈240 m per segment at this latitude
const SEG_METERS = distanceMeters([0.62, LAT], [0.62 + LNG_STEP, LAT]);
const SEG_SECONDS = SEG_METERS / AVG_SPEED_MPS;
const TERMINAL = N - 1; // anchor index for a linear variant
const LINE = "9";

function linearVariant(overrides: Partial<LocatorVariant> = {}): LocatorVariant {
  const stops = Array.from({ length: N }, (_, i) => ({
    id: `id${i}`,
    externalId: `s${i}`,
    lat: LAT,
    lng: 0.62 + i * LNG_STEP,
  }));
  const geometry: LngLat[] = stops.map((s) => [s.lng, s.lat]);
  return { direction: "I", description: "test line", stops, geometry, ...overrides };
}

/** Build an injected probe from a `stopExternalId → journey → etas[]` world. */
function makeProbe(world: Record<string, Record<string, number[]>>): ProbeFn {
  return (stopExt) =>
    Promise.resolve(new Map(Object.entries(world[stopExt] ?? {})));
}

/** A single-journey world: only `s${anchorIdx}` reports the given etas. */
function anchorWorld(
  anchorIdx: number,
  etas: number[],
  journey = "test line",
): Record<string, Record<string, number[]>> {
  return { [`s${anchorIdx}`]: { [journey]: etas } };
}

async function locate(
  variants: LocatorVariant[],
  world: Record<string, Record<string, number[]>>,
) {
  return locateLineBuses({ lineCode: LINE, variants, probe: makeProbe(world) });
}

describe("locateLineBuses — terminal anchoring", () => {
  it("spreads buses back from the terminal by their ETA (fallback speed)", async () => {
    const out = await locate(
      [linearVariant()],
      anchorWorld(TERMINAL, [SEG_SECONDS * 1.5, SEG_SECONDS * 3.5]),
    );
    expect(out).toHaveLength(2);
    const segs = new Set(out.map((p) => `${p.segment.fromStopId}->${p.segment.toStopId}`));
    expect(segs).toEqual(new Set(["id9->id10", "id7->id8"]));
    // Uncalibrated (no second probe) ⇒ medium confidence, tagged with the line.
    expect(out.every((p) => p.confidence === "medium")).toBe(true);
    expect(out.every((p) => p.lineCode === LINE)).toBe(true);
  });

  it("clamps to the origin with low confidence when the ETA predates the route start", async () => {
    const out = await locate([linearVariant()], anchorWorld(TERMINAL, [SEG_SECONDS * 100]));
    expect(out[0]!.segment).toEqual({ fromStopId: "id0", toStopId: "id1" });
    expect(out[0]!.fraction).toBe(0);
    expect(out[0]!.confidence).toBe("low");
  });

  it("falls back to straight stop-lines (medium) without geometry", async () => {
    const out = await locate(
      [linearVariant({ geometry: null })],
      anchorWorld(TERMINAL, [SEG_SECONDS * 1.5]),
    );
    expect(out[0]!.segment).toEqual({ fromStopId: "id9", toStopId: "id10" });
    expect(out[0]!.confidence).toBe("medium");
  });

  it("yields nothing when the terminal reports no real-time arrivals", async () => {
    expect(await locate([linearVariant()], {})).toHaveLength(0);
  });

  it("skips a variant whose journey key matches nothing", async () => {
    const out = await locate(
      [linearVariant({ description: "something else" })],
      anchorWorld(TERMINAL, [120], "no such journey"),
    );
    expect(out).toHaveLength(0);
  });

  it("filters a shared terminal to the variant's own journey", async () => {
    // The terminal lists two journeys; only ours should be located.
    const out = await locate([linearVariant()], {
      [`s${TERMINAL}`]: {
        "test line": [SEG_SECONDS * 1.5],
        "other line": [SEG_SECONDS * 2],
      },
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.journeyName).toBe("test line");
  });
});

describe("locateLineBuses — two-probe calibration", () => {
  // Terminal anchor = 11, calibration anchor = floor(12/2) = 6.
  const arcBetween = 5 * SEG_METERS; // arc(11) − arc(6)
  const TRUE_SPEED = 8; // twice the fallback, to make placement distinguishable
  const T = arcBetween / TRUE_SPEED; // segment time A₂→A, in seconds

  it("recovers a faster real speed and places accordingly (high confidence)", async () => {
    // A bus at the terminal with ETA 2·T sits 2·arcBetween back at the real speed
    // (→ stop 1), but only 1·arcBetween back at the fallback speed (→ stop 6).
    const out = await locate([linearVariant()], {
      s11: { "test line": [2 * T, 2 * T + 60, 2 * T + 120] },
      s6: { "test line": [T, T + 60, T + 120] },
    });
    const bus = out.find((p) => Math.abs(p.etaSeconds - 2 * T) < 1e-6)!;
    expect(bus.segment).toEqual({ fromStopId: "id0", toStopId: "id1" });
    expect(bus.confidence).toBe("high");
  });

  it("median-rejects an outlier calibration reading", async () => {
    // Two clean buses give diff = T; one calib reads far too early (diff 1.8·T).
    const out = await locate([linearVariant()], {
      s11: { "test line": [2 * T, 2 * T, 2 * T] },
      s6: { "test line": [T, T, T / 5] },
    });
    expect(out).toHaveLength(3);
    expect(out.every((p) => p.confidence === "high")).toBe(true);
    expect(out.every((p) => p.segment.fromStopId === "id0" && p.segment.toStopId === "id1")).toBe(true);
  });

  it("falls back to the fixed speed (medium) with too few matchable buses", async () => {
    const out = await locate([linearVariant()], {
      s11: { "test line": [SEG_SECONDS * 1.5] },
      s6: { "test line": [SEG_SECONDS * 0.5] }, // only one bus ⇒ no calibration
    });
    expect(out[0]!.segment).toEqual({ fromStopId: "id9", toStopId: "id10" });
    expect(out[0]!.confidence).toBe("medium");
  });
});

describe("locateLineBuses — closed loop", () => {
  // A rectangular loop A→B→C→D→A. Stops sit at the four corners.
  const A: LngLat = [0.62, 41.6];
  const B: LngLat = [0.63, 41.6];
  const C: LngLat = [0.63, 41.61];
  const D: LngLat = [0.62, 41.61];
  const corners = [A, B, C, D];
  const loopVariant: LocatorVariant = {
    direction: "I",
    description: "loop line",
    stops: corners.map(([lng, lat], i) => ({ id: `id${i}`, externalId: `s${i}`, lat, lng })),
    geometry: [A, B, C, D, A], // closed
  };

  it("falls back to a midpoint anchor when the terminal is empty, and wraps", async () => {
    // Terminal s3 reports nothing; midpoint floor(4/2)=2 (s2=C) reports a bus
    // whose 600 s ETA back-projects past the origin onto the closing D→A segment.
    const out = await locate([loopVariant], { s2: { "loop line": [600] } });
    expect(out).toHaveLength(1);
    expect(out[0]!.segment).toEqual({ fromStopId: "id3", toStopId: "id0" });
    // Loop never clamps; uncalibrated ⇒ medium.
    expect(out[0]!.confidence).toBe("medium");
  });
});

describe("matchVariant", () => {
  it("matches exactly and via an accent-insensitive fallback", () => {
    const variants: LocatorVariant[] = [
      linearVariant({ description: "caparrella - llivia", direction: "V" }),
    ];
    expect(matchVariant("caparrella - llivia", variants)?.direction).toBe("V");
    // Accent on the journey key, none on the stored description → folded match.
    expect(matchVariant("caparrella - llívia", variants)?.direction).toBe("V");
    expect(matchVariant("ronda hospitals", variants)).toBeNull();
  });
});
