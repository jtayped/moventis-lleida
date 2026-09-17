import { describe, expect, it } from "vitest";
import {
  advanceDriftState,
  advanceTracks,
  alignArrivals,
  driftMinutes,
  journeyKey,
  toDriftSamples,
  type DriftTrack,
} from "./arrival-drift";
import type { Schedules } from "../types/schedule";

const MIN = 60_000;
const T0 = 1_760_000_000_000; // an arbitrary epoch instant

describe("alignArrivals", () => {
  it("pairs identical lists index for index", () => {
    expect(alignArrivals([1, 2, 3], [1, 2, 3], MIN)).toEqual([0, 1, 2]);
  });

  it("marks everything new when there is nothing to align against", () => {
    expect(alignArrivals([], [5, 6], MIN)).toEqual([null, null]);
    expect(alignArrivals([5, 6], [], MIN)).toEqual([]);
  });

  it("follows a bus that drifted within tolerance", () => {
    const prev = [10 * MIN, 25 * MIN];
    const curr = [12 * MIN, 24 * MIN]; // first 2 min later, second 1 min earlier
    expect(alignArrivals(prev, curr, 5 * MIN)).toEqual([0, 1]);
  });

  it("drops the head when the first bus has arrived and left", () => {
    const prev = [1 * MIN, 12 * MIN, 24 * MIN];
    const curr = [12 * MIN, 24 * MIN];
    expect(alignArrivals(prev, curr, 5 * MIN)).toEqual([1, 2]);
  });

  it("starts a new track for a bus that appeared at the tail", () => {
    const prev = [12 * MIN, 24 * MIN];
    const curr = [12 * MIN, 24 * MIN, 36 * MIN];
    expect(alignArrivals(prev, curr, 5 * MIN)).toEqual([0, 1, null]);
  });

  it("refuses a pairing outside tolerance even when it is the only candidate", () => {
    expect(alignArrivals([10 * MIN], [30 * MIN], 5 * MIN)).toEqual([null]);
  });

  it("keeps order: never crosses two buses to shave distance", () => {
    // Two buses 4 min apart, both 3 min later. A greedy nearest-first match
    // could pair current[0] with previous[1]; the alignment must not.
    const prev = [10 * MIN, 14 * MIN];
    const curr = [13 * MIN, 17 * MIN];
    expect(alignArrivals(prev, curr, 5 * MIN)).toEqual([0, 1]);
  });

  it("prefers pairing over skipping when a bus vanishes in the middle", () => {
    const prev = [10 * MIN, 20 * MIN, 30 * MIN];
    const curr = [11 * MIN, 31 * MIN]; // the 20-minute bus is gone
    expect(alignArrivals(prev, curr, 5 * MIN)).toEqual([0, 2]);
  });
});

describe("advanceTracks", () => {
  it("opens a track per arrival on first sight, with zero drift", () => {
    const { tracks, drifts } = advanceTracks(
      [],
      [
        { arrivalMs: T0 + 5 * MIN, isRealTime: true },
        { arrivalMs: T0 + 20 * MIN, isRealTime: false },
      ],
    );
    expect(tracks).toHaveLength(2);
    expect(drifts.map((d) => d.deltaMs)).toEqual([0, 0]);
    expect(drifts.map((d) => d.seenCount)).toEqual([1, 1]);
    expect(drifts[1]?.baselineIsRealTime).toBe(false);
  });

  it("measures drift against the first prediction, not the last one", () => {
    let state: DriftTrack[] = [];
    const t1 = advanceTracks(state, [
      { arrivalMs: T0 + 10 * MIN, isRealTime: true },
    ]);
    state = t1.tracks;
    const t2 = advanceTracks(state, [
      { arrivalMs: T0 + 11 * MIN, isRealTime: true },
    ]);
    state = t2.tracks;
    const t3 = advanceTracks(state, [
      { arrivalMs: T0 + 13 * MIN, isRealTime: true },
    ]);

    expect(t2.drifts[0]?.deltaMs).toBe(1 * MIN);
    expect(t3.drifts[0]?.deltaMs).toBe(3 * MIN); // cumulative, not +2
    expect(t3.drifts[0]?.baselineMs).toBe(T0 + 10 * MIN);
    expect(t3.drifts[0]?.seenCount).toBe(3);
  });

  it("keeps following a bus whose accumulated drift exceeds the tolerance", () => {
    // Drifts 3 min per refresh; after three refreshes it is 9 min off its
    // baseline, well past a 5 min tolerance — but each step is within it.
    let tracks: DriftTrack[] = [];
    let last = { deltaMs: 0 };
    for (const minutes of [10, 13, 16, 19]) {
      const r = advanceTracks(tracks, [
        { arrivalMs: T0 + minutes * MIN, isRealTime: true },
      ]);
      tracks = r.tracks;
      last = r.drifts[0]!;
    }
    expect(last.deltaMs).toBe(9 * MIN);
  });

  it("uses the printed timetable as the baseline once the bus goes live", () => {
    const scheduled = advanceTracks(
      [],
      [{ arrivalMs: T0 + 15 * MIN, isRealTime: false }],
    );
    const live = advanceTracks(scheduled.tracks, [
      { arrivalMs: T0 + 13 * MIN, isRealTime: true },
    ]);
    expect(live.drifts[0]).toMatchObject({
      deltaMs: -2 * MIN,
      baselineIsRealTime: false,
      seenCount: 2,
    });
  });

  it("returns drifts in the caller's order even when samples are unsorted", () => {
    const first = advanceTracks(
      [],
      [
        { arrivalMs: T0 + 20 * MIN, isRealTime: true },
        { arrivalMs: T0 + 5 * MIN, isRealTime: true },
      ],
    );
    const second = advanceTracks(first.tracks, [
      { arrivalMs: T0 + 22 * MIN, isRealTime: true }, // the 20 → +2
      { arrivalMs: T0 + 4 * MIN, isRealTime: true }, // the 5 → -1
    ]);
    expect(second.drifts.map((d) => d.deltaMs)).toEqual([2 * MIN, -1 * MIN]);
  });

  it("forgets a bus that is no longer listed", () => {
    const first = advanceTracks(
      [],
      [
        { arrivalMs: T0 + 1 * MIN, isRealTime: true },
        { arrivalMs: T0 + 15 * MIN, isRealTime: true },
      ],
    );
    const second = advanceTracks(first.tracks, [
      { arrivalMs: T0 + 15 * MIN, isRealTime: true },
    ]);
    expect(second.tracks).toHaveLength(1);
    expect(second.tracks[0]?.baselineMs).toBe(T0 + 15 * MIN);
  });

  it("does not mutate the tracks it was given", () => {
    const tracks: DriftTrack[] = [
      { baselineMs: T0, baselineIsRealTime: true, lastMs: T0, seenCount: 1 },
    ];
    const snapshot = JSON.stringify(tracks);
    advanceTracks(tracks, [{ arrivalMs: T0 + MIN, isRealTime: true }]);
    expect(JSON.stringify(tracks)).toBe(snapshot);
  });
});

describe("advanceDriftState", () => {
  it("keys tracks per journey and drops journeys that disappeared", () => {
    const s1 = advanceDriftState(
      {},
      {
        "137|anada": [{ arrivalMs: T0 + 10 * MIN, isRealTime: true }],
        "137|tornada": [{ arrivalMs: T0 + 12 * MIN, isRealTime: true }],
      },
    );
    const s2 = advanceDriftState(s1.state, {
      "137|anada": [{ arrivalMs: T0 + 12 * MIN, isRealTime: true }],
    });
    expect(Object.keys(s2.state)).toEqual(["137|anada"]);
    expect(s2.drifts["137|anada"]?.[0]?.deltaMs).toBe(2 * MIN);
  });
});

describe("driftMinutes", () => {
  it("rounds half away from zero and treats under a minute as nothing", () => {
    expect(driftMinutes(0)).toBe(0);
    expect(driftMinutes(29_000)).toBe(0);
    expect(driftMinutes(-29_000)).toBe(0);
    expect(driftMinutes(90_000)).toBe(2);
    expect(driftMinutes(-90_000)).toBe(-2);
    expect(driftMinutes(119_000)).toBe(2);
    expect(driftMinutes(-4 * MIN - 10_000)).toBe(-4);
  });
});

describe("toDriftSamples", () => {
  const time = (minutes: number, isRealTime: boolean) => ({
    arrivalTime: new Date(T0 + minutes * MIN),
    isRealTime,
    accessible: null,
  });

  const schedules: Schedules = [
    {
      externalLineId: "137",
      lineCode: "1",
      lineName: "Linia 1",
      selected: true,
      incidencias: null,
      journeys: [
        { name: "Pardinyes", scheduledTimes: [time(8, true), time(-3, false)] },
        { name: "Cappont", scheduledTimes: [time(12, false)] },
      ],
    },
    {
      externalLineId: "204",
      lineCode: "4",
      lineName: "Linia 4",
      selected: false,
      incidencias: null,
      // Same direction name as line 1: the key has to keep them apart, or one
      // line's buses would be aligned against the other's.
      journeys: [{ name: "Pardinyes", scheduledTimes: [time(9, true)] }],
    },
  ];

  it("keys samples per line and journey, in the order the API gave them", () => {
    const samples = toDriftSamples(schedules);

    expect(Object.keys(samples).sort()).toEqual([
      journeyKey("137", "Cappont"),
      journeyKey("137", "Pardinyes"),
      journeyKey("204", "Pardinyes"),
    ]);
    // Unsorted, and the already-past time kept: the drawer hides it, the
    // alignment must still see it as the tail of a track.
    expect(samples[journeyKey("137", "Pardinyes")]).toEqual([
      { arrivalMs: T0 + 8 * MIN, isRealTime: true },
      { arrivalMs: T0 - 3 * MIN, isRealTime: false },
    ]);
    expect(samples[journeyKey("204", "Pardinyes")]).toEqual([
      { arrivalMs: T0 + 9 * MIN, isRealTime: true },
    ]);
  });

  it("feeds advanceDriftState straight, drifts landing back in input order", () => {
    const first = advanceDriftState({}, toDriftSamples(schedules));
    const later: Schedules = [
      {
        ...schedules[0]!,
        journeys: [
          {
            name: "Pardinyes",
            // The 8-minute bus slipped two minutes; the past one is gone.
            scheduledTimes: [time(10, true)],
          },
          { name: "Cappont", scheduledTimes: [time(12, false)] },
        ],
      },
      schedules[1]!,
    ];
    const second = advanceDriftState(first.state, toDriftSamples(later));

    expect(second.drifts[journeyKey("137", "Pardinyes")]?.[0]?.deltaMs).toBe(
      2 * MIN,
    );
    expect(second.drifts[journeyKey("137", "Cappont")]?.[0]).toMatchObject({
      deltaMs: 0,
      baselineIsRealTime: false,
    });
  });

  it("returns nothing for a stop with no schedules", () => {
    expect(toDriftSamples([])).toEqual({});
  });
});
