import { afterEach, describe, expect, it, vi } from "vitest";
import type { Schedules } from "@moventis/shared";
import type * as StopScheduleModule from "./stop-schedule";

vi.mock("./stop-schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof StopScheduleModule>();
  return { ...actual, getStopSchedule: vi.fn() };
});

import { getStopSchedule } from "./stop-schedule";
import {
  BOARD_FRESH_MS,
  BOARD_STALE_MS,
  clearStopBoards,
  fetchStopBoard,
  recentStopBoard,
} from "./stop-boards";

const mocked = vi.mocked(getStopSchedule);
const schedules: Schedules = [];

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  clearStopBoards();
});

describe("fetchStopBoard", () => {
  it("shares one request between callers, in flight and while fresh", async () => {
    mocked.mockResolvedValue(schedules);
    const [a, b] = await Promise.all([
      fetchStopBoard("10211", "129", "batch"),
      fetchStopBoard("10211", "134", "batch"),
    ]);
    const c = await fetchStopBoard("10211", "129", "batch");
    expect(a).toBe(b);
    expect(c).toBe(a);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked).toHaveBeenCalledWith("10211", "129", "batch");
  });

  it("asks again once the board is no longer fresh", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mocked.mockResolvedValue(schedules);
    await fetchStopBoard("10211", "129", "batch");
    vi.setSystemTime(Date.now() + BOARD_FRESH_MS);
    await fetchStopBoard("10211", "129", "batch");
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it("keeps no failure, and keeps the last good board for a fallback", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mocked.mockResolvedValueOnce(schedules);
    const good = await fetchStopBoard("10211", "129", "batch");

    vi.setSystemTime(Date.now() + BOARD_FRESH_MS);
    mocked.mockResolvedValueOnce(null);
    expect(await fetchStopBoard("10211", "129", "batch")).toBeNull();
    // Still the last answer, for a plan whose fresh request failed...
    expect(recentStopBoard("10211")).toBe(good);
    // ...and the failure was not kept: the next caller asks again.
    mocked.mockRejectedValueOnce(new Error("shape changed"));
    expect(await fetchStopBoard("10211", "129", "batch")).toBeNull();
    expect(mocked).toHaveBeenCalledTimes(3);

    vi.setSystemTime(good!.fetchedAt + BOARD_STALE_MS);
    expect(recentStopBoard("10211")).toBeNull();
  });
});
