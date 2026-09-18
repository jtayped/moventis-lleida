import { describe, expect, it } from "vitest";
import {
  INITIAL_PULL_STATE,
  nextSnapIndex,
  PULL_COMMIT_THRESHOLD_PX,
  trackDrawerPull,
  type PullSample,
  type PullState,
} from "./drawer-pull";

/** A scroller 1000px of content in a 400px window, parked wherever asked. */
const at = (scrollTop: number, y: number): PullSample => ({
  scrollTop,
  scrollHeight: 1000,
  clientHeight: 400,
  y,
});

/** Content that fits entirely — at the top and the bottom at once. */
const short = (y: number): PullSample => ({
  scrollTop: 0,
  scrollHeight: 300,
  clientHeight: 400,
  y,
});

/** Feeds a whole gesture and returns the commits it produced, in order. */
function run(samples: PullSample[]) {
  let state: PullState = INITIAL_PULL_STATE;
  const commits: (string | null)[] = [];
  for (const sample of samples) {
    const result = trackDrawerPull(state, sample);
    state = result.state;
    if (result.commit) commits.push(result.commit);
  }
  return { state, commits };
}

const BEYOND = PULL_COMMIT_THRESHOLD_PX + 1;

describe("trackDrawerPull", () => {
  it("collapses on a pull down once the content is at its top", () => {
    const { commits } = run([at(0, 100), at(0, 100 + BEYOND)]);
    expect(commits).toEqual(["collapse"]);
  });

  it("expands on a pull up once the content is at its bottom", () => {
    const bottom = 1000 - 400;
    const { commits } = run([at(bottom, 300), at(bottom, 300 - BEYOND)]);
    expect(commits).toEqual(["expand"]);
  });

  it("does nothing mid-list, however far the finger travels", () => {
    const { commits, state } = run([at(200, 400), at(200, 400 + BEYOND * 3)]);
    expect(commits).toEqual([]);
    expect(state).toEqual(INITIAL_PULL_STATE);
  });

  it("ignores a pull short of the threshold", () => {
    const { commits } = run([
      at(0, 100),
      at(0, 100 + PULL_COMMIT_THRESHOLD_PX - 1),
    ]);
    expect(commits).toEqual([]);
  });

  it("does not collapse on a drag up at the top — that is an ordinary scroll", () => {
    const { commits } = run([at(0, 300), at(0, 300 - BEYOND)]);
    expect(commits).toEqual([]);
  });

  it("does not expand on a drag down at the bottom — that is an ordinary scroll", () => {
    const bottom = 1000 - 400;
    const { commits } = run([at(bottom, 100), at(bottom, 100 + BEYOND)]);
    expect(commits).toEqual([]);
  });

  it("commits at most once per gesture", () => {
    const { commits } = run([
      at(0, 100),
      at(0, 100 + BEYOND),
      at(0, 100 + BEYOND * 2),
      at(0, 100 + BEYOND * 3),
    ]);
    expect(commits).toEqual(["collapse"]);
  });

  it("re-arms after the content scrolls away from the edge and back", () => {
    const { commits } = run([
      at(0, 100),
      at(0, 100 + BEYOND), // commits
      at(200, 300), // scrolled away: state is wiped
      at(0, 100),
      at(0, 100 + BEYOND), // commits again
    ]);
    expect(commits).toEqual(["collapse", "collapse"]);
  });

  it("does not bank distance across a reversal", () => {
    // Two short runs either side of a turning point must not add up into one
    // that crosses the threshold.
    const { commits } = run([at(0, 100), at(0, 140), at(0, 90), at(0, 140)]);
    expect(commits).toEqual([]);
  });

  it("measures a run from the turning point, not from where the finger landed", () => {
    // Lifting to 250 and then pulling down to 363 is a 113px downward run,
    // even though the finger only ends 63px below where it started.
    const { commits } = run([at(0, 300), at(0, 250), at(0, 363)]);
    expect(commits).toEqual(["collapse"]);
  });

  it("does not let jitter reset a genuine pull", () => {
    const { commits } = run([
      at(0, 100),
      at(0, 120),
      at(0, 119), // one pixel of digitizer noise
      at(0, 119 + BEYOND),
    ]);
    expect(commits).toEqual(["collapse"]);
  });

  it("treats content shorter than its window as both edges at once", () => {
    expect(run([short(100), short(100 + BEYOND)]).commits).toEqual([
      "collapse",
    ]);
    expect(run([short(300), short(300 - BEYOND)]).commits).toEqual(["expand"]);
  });

  it("tolerates a fractional scroll offset at an edge", () => {
    const { commits } = run([at(0.5, 100), at(0.5, 100 + BEYOND)]);
    expect(commits).toEqual(["collapse"]);
  });

  it("never commits on the first sample, whatever it holds", () => {
    expect(trackDrawerPull(INITIAL_PULL_STATE, at(0, 9999)).commit).toBeNull();
  });
});

describe("nextSnapIndex", () => {
  it("steps one snap either way", () => {
    expect(nextSnapIndex(1, "expand", 3)).toBe(2);
    expect(nextSnapIndex(1, "collapse", 3)).toBe(0);
  });

  it("clamps rather than dismissing past the peek or growing past the top", () => {
    expect(nextSnapIndex(0, "collapse", 3)).toBe(0);
    expect(nextSnapIndex(2, "expand", 3)).toBe(2);
  });
});
