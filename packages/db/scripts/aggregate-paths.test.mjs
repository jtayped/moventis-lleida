// Run: node --test packages/db/scripts/aggregate-paths.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregatePaths } from "./aggregate-paths.mjs";

test("collapses a shared trunk shared by two variations", () => {
  // Two variations share the segment A-B-C, then diverge at C.
  const A = [0.6, 41.6];
  const B = [0.601, 41.6];
  const C = [0.602, 41.6];
  const D = [0.603, 41.601]; // variation 1 tail
  const E = [0.603, 41.599]; // variation 2 tail
  const variations = [
    { points: [A, B, C, D] },
    { points: [A, B, C, E] },
  ];
  const paths = aggregatePaths(variations);

  const rawPoints = variations.reduce((n, v) => n + v.points.length, 0); // 8
  const outPoints = paths.reduce((n, p) => n + p.length, 0);
  assert.ok(outPoints < rawPoints, "deduped points should be fewer than raw sum");

  // The shared trunk A-B-C must appear exactly once across all output paths.
  const flat = paths.flat();
  const countB = flat.filter(([lng, lat]) => lng === B[0] && lat === B[1]).length;
  assert.equal(countB, 1, "shared mid-trunk point B should appear once");

  // C is a junction (degree 3): trunk splits there into separate branches.
  const countC = flat.filter(([lng, lat]) => lng === C[0] && lat === C[1]).length;
  assert.ok(countC >= 2, "junction point C is shared by multiple split paths");
});

test("snaps near-identical points within tolerance to one vertex", () => {
  const variations = [
    { points: [[0.6, 41.6], [0.601, 41.6]] },
    // second variation is the same street, jittered by < 1m
    { points: [[0.6000004, 41.6000004], [0.6010003, 41.6]] },
  ];
  const paths = aggregatePaths(variations);
  assert.equal(paths.length, 1, "identical streets collapse to a single path");
  assert.equal(paths[0].length, 2);
});

test("keeps genuinely separate parallel streets apart", () => {
  // Opposite-direction streets ~50m apart — must NOT be merged.
  const variations = [
    { points: [[0.6, 41.6], [0.602, 41.6]] },
    { points: [[0.6, 41.6005], [0.602, 41.6005]] },
  ];
  const paths = aggregatePaths(variations);
  assert.equal(paths.length, 2, "parallel streets stay as two paths");
});

test("handles a single variation unchanged in shape", () => {
  const variations = [{ points: [[0.6, 41.6], [0.601, 41.6], [0.602, 41.601]] }];
  const paths = aggregatePaths(variations);
  assert.equal(paths.length, 1);
  assert.equal(paths[0].length, 3);
});
