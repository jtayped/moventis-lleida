import { describe, expect, it } from "vitest";
import { distanceMeters, type BusPosition, type LngLat } from "@moventis/shared";
import {
  alignLists,
  checkConsistency,
  coarseIndices,
  dedupeVariants,
  DEFAULT_PROBE_BUDGET,
  locateLineBuses,
  matchVariant,
  maxTravelSeconds,
  type LineLocatorResult,
  type LocatorVariant,
  type VariantTrace,
} from "./bus-locator";
import {
  makeStops,
  makeVariant,
  segmentTimes,
  simulateWorld,
  trueBracket,
  type SimVariant,
  type SimWorldOptions,
} from "./testing/fleet-simulator";
import { snapshotWorld } from "./testing/snapshot-world";

const LINE = "9";

/** Index of a stop id within a variant. */
function indexOf(variant: LocatorVariant, stopId: string): number {
  return variant.stops.findIndex((s) => s.id === stopId);
}

/** The emitted bracket of a position, as variant stop indices. */
function bracketOf(variant: LocatorVariant, p: BusPosition) {
  return { fromIndex: indexOf(variant, p.segment.fromStopId), toIndex: indexOf(variant, p.segment.toStopId) };
}

/**
 * Every simulated bus is emitted exactly once, inside a bracket that contains
 * its true segment, and nothing else is emitted for that journey.
 */
function expectFleetLocated(result: LineLocatorResult, sims: SimVariant[]) {
  for (const sim of sims) {
    const journey = sim.journey ?? sim.variant.description;
    const mine = result.positions.filter((p) => p.journeyName === journey);
    expect(mine, `positions for ${journey}`).toHaveLength(sim.buses.length);
    const unclaimed = [...mine];
    for (const bus of sim.buses) {
      const truth = trueBracket(bus);
      const idx = unclaimed.findIndex((p) => {
        const b = bracketOf(sim.variant, p);
        return b.fromIndex <= truth.fromIndex && truth.toIndex <= b.toIndex;
      });
      expect(idx, `bus on segment ${bus.segment} of ${journey} has a bracket`).toBeGreaterThanOrEqual(0);
      unclaimed.splice(idx, 1);
    }
  }
}

function expectConsistent(result: LineLocatorResult) {
  for (const trace of result.variants) {
    for (const v of checkConsistency(trace)) {
      expect(v.problems, `${v.position.journeyName} eta=${v.position.etaSeconds.toFixed(0)}`).toEqual([]);
    }
  }
}

async function run(sims: SimVariant[], opts: SimWorldOptions = {}, budget?: Partial<typeof DEFAULT_PROBE_BUDGET>) {
  const world = simulateWorld(sims, opts);
  const result = await locateLineBuses({
    lineCode: LINE,
    variants: sims.map((s) => s.variant),
    probe: world.probe,
    budget,
  });
  return { result, world };
}

// ─── Building blocks ────────────────────────────────────────────────────────

/** A 20-stop linear variant at 250 m spacing, 6 m/s, 20 s dwell. */
function linear(buses: SimVariant["buses"], extra: Partial<SimVariant> = {}): SimVariant {
  const stops = makeStops(20);
  return {
    variant: makeVariant(stops),
    segmentSeconds: segmentTimes(stops, 6),
    dwellSeconds: 20,
    buses,
    departures: [600, 1500, 2400],
    ...extra,
  };
}

/** A 28-stop loop (terminal === origin), like line 2. */
function loop(buses: SimVariant["buses"], extra: Partial<SimVariant> = {}): SimVariant {
  const stops = makeStops(28, { loop: true, spacingM: 280 });
  return {
    variant: makeVariant(stops, { description: "ronda hospitals" }),
    segmentSeconds: segmentTimes(stops, 5),
    dwellSeconds: 20,
    layoverSeconds: 420,
    buses,
    departures: [],
    ...extra,
  };
}

describe("alignLists", () => {
  const T = 300;

  it("pairs the same trips and reports leading unpaired downstream entries as buses", () => {
    // Upstream lists two trips; downstream lists a bus already past the upstream
    // stop (60 s out) and the same two trips 120 s later.
    const a = alignLists([600, 1500], [60, 720, 1620], T);
    expect(a.between).toEqual([60]);
    expect(a.pairs).toEqual([
      { upstream: 600, downstream: 720 },
      { upstream: 1500, downstream: 1620 },
    ]);
    expect(a.ignored).toEqual([]);
  });

  it("does not read a downstream entry beyond the travel bound as a bus", () => {
    // 900 s out cannot be inside a 300 s bracket; the upstream stop failed to
    // list that trip, so it is ignored rather than drawn.
    const a = alignLists([1500], [900, 1620], T);
    expect(a.between).toEqual([]);
    expect(a.ignored).toEqual([900]);
  });

  it("treats trailing downstream entries as the cap's doing when upstream is full", () => {
    const a = alignLists([100, 200, 300, 400, 500], [150, 250, 350, 450, 550, 650], T);
    expect(a.between).toEqual([]);
    expect(a.pairs).toHaveLength(5);
    expect(a.ignored).toEqual([650]);
  });

  it("trusts trailing entries within the bound when the upstream list is short (complete)", () => {
    // Nothing upstream at all: a 40 s arrival is a bus in the bracket.
    expect(alignLists([], [40, 2000], T).between).toEqual([40]);
    expect(alignLists([], [40, 2000], T).ignored).toEqual([2000]);
  });

  it("tolerates a downstream entry a few seconds earlier than its upstream twin", () => {
    // Same absolute arrival at both stops (scheduled offset 0) with probe drift.
    const a = alignLists([500], [490], T);
    expect(a.pairs).toEqual([{ upstream: 500, downstream: 490 }]);
    expect(a.between).toEqual([]);
  });

  it("skips an upstream entry with no downstream counterpart", () => {
    const a = alignLists([100, 900], [950], T);
    expect(a.pairs).toEqual([{ upstream: 900, downstream: 950 }]);
    expect(a.between).toEqual([]);
  });

  it("keeps a duplicate downstream entry from becoming a bus", () => {
    // Seen live on line 5: 14402 listed 1:02:31 twice.
    const a = alignLists([3694, 5074], [3751, 3751, 5131], T);
    expect(a.between).toEqual([]);
    expect(a.ignored).toEqual([3751]);
  });
});

describe("plan and matching", () => {
  it("coarse indices always include origin and terminal and respect the stride cap", () => {
    expect(coarseIndices(28, DEFAULT_PROBE_BUDGET)).toEqual([0, 5, 10, 15, 20, 25, 27]);
    expect(coarseIndices(6, DEFAULT_PROBE_BUDGET)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(coarseIndices(64, DEFAULT_PROBE_BUDGET)).toEqual([0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 63]);
  });

  it("maxTravelSeconds grows with distance and stop count", () => {
    expect(maxTravelSeconds(278, 1)).toBeGreaterThan(236); // live hospital segment
    expect(maxTravelSeconds(1000, 4)).toBeGreaterThan(maxTravelSeconds(1000, 1));
  });

  it("matchVariant matches exactly and via an accent-insensitive fallback", () => {
    const variants: LocatorVariant[] = [
      makeVariant(makeStops(3), { description: "caparrella - llivia", direction: "V" }),
    ];
    expect(matchVariant("caparrella - llivia", variants)?.direction).toBe("V");
    expect(matchVariant("caparrella - llívia", variants)?.direction).toBe("V");
    expect(matchVariant("ronda hospitals", variants)).toBeNull();
  });

  it("dedupeVariants keeps the longest of same-named variants", () => {
    const short = makeVariant(makeStops(5), { description: "polígons" });
    const long = makeVariant(makeStops(9, { prefix: "l" }), { description: "polígons" });
    const other = makeVariant(makeStops(4, { prefix: "o" }), { description: "polígons", direction: "V" });
    expect(dedupeVariants([short, long, other])).toEqual([long, other]);
  });
});

describe("locateLineBuses — simulated fleets", () => {
  it("places every bus of a linear line in its true segment, with adjacent-stop brackets", async () => {
    const sim = linear([
      { segment: 2, fraction: 0.4 },
      { segment: 9, fraction: 0.9 },
      { segment: 15, fraction: 0.1 },
    ]);
    const { result } = await run([sim]);
    expectFleetLocated(result, [sim]);
    expectConsistent(result);
    expect(result.positions.every((p) => p.spanStops === 1 && p.confidence === "high")).toBe(true);
    expect(result.probeCount).toBeLessThanOrEqual(6 + DEFAULT_PROBE_BUDGET.refineProbes);
  });

  it("emits nothing for a line whose only entries are future departures", async () => {
    const sim = linear([]);
    const { result } = await run([sim]);
    expect(result.positions).toEqual([]);
    // The coarse pass only: nothing to refine.
    expect(result.probeCount).toBe(coarseIndices(20, DEFAULT_PROBE_BUDGET).length);
  });

  it("survives dwell variation, jitter and the 5-entry cap", async () => {
    const sim = linear(
      [
        { segment: 0, fraction: 0.5 },
        { segment: 7, fraction: 0.2 },
        { segment: 12, fraction: 0.7 },
        { segment: 18, fraction: 0.3 },
      ],
      { dwellSeconds: 45, departures: [300, 900, 1500, 2100, 2700, 3300] },
    );
    const { result } = await run([sim], { jitterSeconds: 25 });
    expectFleetLocated(result, [sim]);
    expectConsistent(result);
  });

  it("brackets across a stop whose response omits the journey, without inventing buses", async () => {
    const sim = linear([{ segment: 5, fraction: 0.5 }]);
    const { result } = await run([sim], { missingJourneyAt: ["s4", "s5", "s6"] });
    expectFleetLocated(result, [sim]);
    expectConsistent(result);
    const p = result.positions[0]!;
    // The bracket widened around the unlisted stops and says so.
    expect(p.spanStops).toBeGreaterThan(1);
    expect(p.confidence).not.toBe("high");
  });

  it("brackets across a failed probe", async () => {
    const sim = linear([{ segment: 9, fraction: 0.5 }]);
    const { result } = await run([sim], { failAt: ["s9", "s10"] });
    expectFleetLocated(result, [sim]);
    expectConsistent(result);
    expect(result.positions[0]!.spanStops).toBeGreaterThan(1);
  });

  it("keeps two directions apart at the stops they share", async () => {
    const out = makeStops(12, { prefix: "o" });
    const back = [...out].reverse().map((s, i) => ({ ...s, id: `bid${i}` }));
    const ida: SimVariant = {
      variant: makeVariant(out, { description: "a - b", direction: "I" }),
      segmentSeconds: segmentTimes(out, 6),
      dwellSeconds: 15,
      buses: [{ segment: 3, fraction: 0.5 }],
      departures: [700, 1600],
    };
    const vuelta: SimVariant = {
      variant: makeVariant(back, { description: "b - a", direction: "V" }),
      segmentSeconds: segmentTimes(back, 6),
      dwellSeconds: 15,
      buses: [{ segment: 6, fraction: 0.2 }],
      departures: [400, 1300],
    };
    const { result, world } = await run([ida, vuelta]);
    expectFleetLocated(result, [ida, vuelta]);
    expectConsistent(result);
    // Shared stops are fetched once for both variants.
    expect(new Set(world.calls).size).toBe(world.calls.length);
  });

  it("stays within the probe budget on a long variant", async () => {
    const stops = makeStops(64);
    const sim: SimVariant = {
      variant: makeVariant(stops),
      segmentSeconds: segmentTimes(stops, 6),
      dwellSeconds: 20,
      buses: [
        { segment: 4, fraction: 0.5 },
        { segment: 20, fraction: 0.5 },
        { segment: 33, fraction: 0.5 },
        { segment: 50, fraction: 0.5 },
        { segment: 61, fraction: 0.5 },
      ],
      departures: [500, 1400],
    };
    const { result } = await run([sim]);
    expectFleetLocated(result, [sim]);
    expectConsistent(result);
    expect(result.probeCount).toBeLessThanOrEqual(12 + DEFAULT_PROBE_BUDGET.refineProbes);
  });
});

describe("locateLineBuses — loops", () => {
  it("does not draw a bus's next-lap projections as extra buses", async () => {
    // Two buses; every stop lists both twice (this lap, and the next lap after
    // the layover), so the raw lists show four entries — plus departures.
    const sim = loop([
      { segment: 4, fraction: 0.5 },
      { segment: 17, fraction: 0.3 },
    ]);
    const { result } = await run([sim]);
    expectFleetLocated(result, [sim]);
    expectConsistent(result);
  });

  it("finds a bus that just departed, and admits it cannot see one in the closing segment", async () => {
    // A loop's terminal is its origin, and a bus approaching it is listed
    // there only as its *next departure*, after the layover — beyond the
    // closing bracket's travel bound, and indistinguishable from a departure
    // whose vehicle is still at the depot. Rather than draw a possibly
    // phantom bus at the terminal, the locator leaves that segment blind; the
    // bus reappears at the first stop after it departs.
    const approaching = { segment: 26, fraction: 0.6 };
    const departed = { segment: 0, fraction: 0.2 };
    const sim = loop([approaching, departed]);
    const { result } = await run([sim]);
    expectFleetLocated(result, [{ ...sim, buses: [departed] }]);
    expectConsistent(result);
  });

  it("regression: the line-2 screenshot — 5, 26, 46, 63, 80 min at one stop is three buses, not a convoy", async () => {
    // Three buses spaced a headway apart on a 48-minute loop, no extra trips.
    // At a stop just ahead of the first bus the list reads roughly
    // [~5 min, ~26 min, ~46 min, ~63 min, ~80 min] — the last three being the
    // same three vehicles on their next lap. The old locator drew all five,
    // back-projected around the loop, which put three markers within a few
    // hundred metres of each other.
    const stops = makeStops(28, { loop: true, spacingM: 280 });
    const sim: SimVariant = {
      variant: makeVariant(stops, { description: "ronda hospitals" }),
      segmentSeconds: segmentTimes(stops, 2.5),
      dwellSeconds: 30,
      layoverSeconds: 420,
      departures: [],
      buses: [
        { segment: 14, fraction: 0.5 },
        { segment: 4, fraction: 0.5 },
        { segment: 21, fraction: 0.5 },
      ],
    };
    const { result, world } = await run([sim]);

    // The stop right ahead of the first bus lists five entries, as in the screenshot.
    const ahead = await world.probe(sim.variant.stops[17]!.externalId);
    const list = ahead!.get("ronda hospitals")!;
    expect(list).toHaveLength(5);
    expect(list[0]!).toBeLessThan(6 * 60);
    expect(list[1]!).toBeGreaterThan(20 * 60);

    expect(result.positions).toHaveLength(3);
    expectFleetLocated(result, [sim]);
    expectConsistent(result);

    // No convoy: every pair of markers is at least a couple of stops apart.
    const pts = result.positions.map((p): LngLat => [p.lng, p.lat]);
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(distanceMeters(pts[i]!, pts[j]!)).toBeGreaterThan(600);
      }
    }
  });
});

describe("consistency invariant", () => {
  it("flags a position the stop lists contradict", () => {
    // A hand-built trace: the "bus" at 100 s is also listed upstream at 40 s,
    // with nothing earlier downstream to explain that entry.
    const stops = makeStops(4);
    const trace: VariantTrace = {
      direction: "I",
      description: "x",
      journeyName: "x",
      loop: false,
      stopCount: 4,
      stopArcs: [0, 250, 500, 750],
      totalArc: 750,
      probed: [
        { index: 0, stopId: stops[0]!.id, externalId: stops[0]!.externalId, etas: [40] },
        { index: 1, stopId: stops[1]!.id, externalId: stops[1]!.externalId, etas: [100] },
      ],
      placed: [
        {
          fromIndex: 0,
          toIndex: 1,
          position: {
            lineCode: LINE,
            journeyName: "x",
            direction: "I",
            lat: stops[1]!.lat,
            lng: stops[1]!.lng,
            segment: { fromStopId: stops[0]!.id, toStopId: stops[1]!.id },
            spanStops: 1,
            fraction: 0.5,
            etaSeconds: 100,
            confidence: "high",
          },
        },
      ],
    };
    const [verdict] = checkConsistency(trace);
    expect(verdict!.ok).toBe(false);
    expect(verdict!.problems[0]).toMatch(/upstream stop #0/);
  });

  it("accepts a position whose upstream suspect is explained by an earlier downstream entry", () => {
    const stops = makeStops(3);
    const trace: VariantTrace = {
      direction: "I",
      description: "x",
      journeyName: "x",
      loop: false,
      stopCount: 3,
      stopArcs: [0, 250, 500],
      totalArc: 500,
      probed: [
        { index: 0, stopId: stops[0]!.id, externalId: stops[0]!.externalId, etas: [5] },
        { index: 1, stopId: stops[1]!.id, externalId: stops[1]!.externalId, etas: [15, 200] },
      ],
      placed: [
        {
          fromIndex: 0,
          toIndex: 1,
          position: {
            lineCode: LINE,
            journeyName: "x",
            direction: "I",
            lat: 0,
            lng: 0,
            segment: { fromStopId: stops[0]!.id, toStopId: stops[1]!.id },
            spanStops: 1,
            fraction: 0.5,
            etaSeconds: 200,
            confidence: "high",
          },
        },
      ],
    };
    // 5 s upstream → 15 s downstream is another trip; the 200 s bus is between.
    expect(checkConsistency(trace)[0]!.ok).toBe(true);
  });
});

describe("recorded snapshots", () => {
  it("line 2 (loop, 20:16 on 2026-09-17): three buses, each between adjacent stops", async () => {
    const { variants, probe, calls, snapshot } = snapshotWorld("line-2-loop-snapshot.json");
    const result = await locateLineBuses({ lineCode: snapshot.routeCode, variants, probe });

    // The three "0 min 00 s" entries in the capture: stops 10379, 13056, 10246.
    const arriving = result.positions
      .map((p) => variants[0]!.stops[indexOf(variants[0]!, p.segment.toStopId)]!.externalId)
      .sort();
    expect(arriving).toEqual(["10246", "10379", "13056"]);
    expect(result.positions.every((p) => p.spanStops === 1 && p.confidence === "high")).toBe(true);
    expect(result.positions.every((p) => p.etaSeconds < 60)).toBe(true);
    expectConsistent(result);
    // The terminal is the origin: one fetch serves both ends of the chain.
    expect(new Set(calls).size).toBeLessThanOrEqual(7 + DEFAULT_PROBE_BUDGET.refineProbes);
    expect(result.probeCount).toBe(new Set(calls).size);
  });

  it("line 5 (linear, 20:25 on 2026-09-17): two buses outbound, one inbound", async () => {
    const { variants, probe, snapshot } = snapshotWorld("line-5-linear-snapshot.json");
    const result = await locateLineBuses({ lineCode: snapshot.routeCode, variants, probe });

    const byDirection = (d: "I" | "V") => result.positions.filter((p) => p.direction === d);
    const v = variants.find((x) => x.direction === "V")!;
    const i = variants.find((x) => x.direction === "I")!;

    // V: "0 min 19 s" at 10796 and "0 min 00 s" at 10198.
    expect(byDirection("V").map((p) => v.stops[indexOf(v, p.segment.toStopId)]!.externalId).sort()).toEqual([
      "10198",
      "10796",
    ]);
    // I: "1 min 02 s" at 10798 (mercat balàfia).
    expect(byDirection("I").map((p) => i.stops[indexOf(i, p.segment.toStopId)]!.externalId)).toEqual(["10798"]);
    expect(result.positions.every((p) => p.spanStops === 1)).toBe(true);
    expectConsistent(result);
  });
});
