import { describe, expect, it } from "vitest";
import {
  cumulativeArcLengths,
  distanceMeters,
  flattenPaths,
  pointAtArc,
  projectToPolyline,
  type LngLat,
} from "./geo";

// A straight horizontal polyline at Lleida latitude, ~each step ≈ 83 m.
const lat = 41.6;
const line: LngLat[] = [
  [0.62, lat],
  [0.621, lat],
  [0.622, lat],
  [0.623, lat],
];

describe("geo", () => {
  it("cumulativeArcLengths is increasing and starts at 0", () => {
    const cum = cumulativeArcLengths(line);
    expect(cum[0]).toBe(0);
    for (let i = 1; i < cum.length; i++) expect(cum[i]!).toBeGreaterThan(cum[i - 1]!);
  });

  it("pointAtArc midpoint of first segment lands halfway", () => {
    const cum = cumulativeArcLengths(line);
    const mid = pointAtArc(line, cum, cum[1]! / 2);
    expect(Math.abs(mid[0] - 0.6205)).toBeLessThan(1e-6);
    expect(Math.abs(mid[1] - lat)).toBeLessThan(1e-9);
  });

  it("pointAtArc clamps beyond the ends", () => {
    const cum = cumulativeArcLengths(line);
    expect(pointAtArc(line, cum, -100)).toEqual(line[0]);
    expect(pointAtArc(line, cum, 1e9)).toEqual(line[line.length - 1]);
  });

  it("projectToPolyline drops a perpendicular onto the nearest segment", () => {
    // A point above the second vertex projects back down onto it.
    const cum = cumulativeArcLengths(line);
    const { arc, point } = projectToPolyline([0.621, lat + 0.0005], line, cum);
    expect(Math.abs(point[0] - 0.621)).toBeLessThan(1e-4);
    expect(Math.abs(arc - cum[1]!)).toBeLessThan(1.0); // within a metre of vertex 1
  });

  it("distanceMeters is symmetric and ~0 for identical points", () => {
    expect(distanceMeters([0.62, lat], [0.62, lat])).toBe(0);
    const d1 = distanceMeters([0.62, lat], [0.621, lat]);
    const d2 = distanceMeters([0.621, lat], [0.62, lat]);
    expect(Math.abs(d1 - d2)).toBeLessThan(1e-6);
    expect(d1).toBeGreaterThan(50);
    expect(d1).toBeLessThan(120); // ~83 m
  });

  it("flattenPaths concatenates fragments in order", () => {
    const paths: LngLat[][] = [
      [
        [0, 0],
        [1, 1],
      ],
      [
        [2, 2],
        [3, 3],
      ],
    ];
    expect(flattenPaths(paths)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });
});
