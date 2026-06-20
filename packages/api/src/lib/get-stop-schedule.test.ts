import { afterEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError } from "axios";
import { TRPCError } from "@trpc/server";
import { getStopSchedule } from "./stop-schedule";
import { loadFixture } from "../__fixtures__/load";

// Mock only axios.get; keep the real AxiosError class so `instanceof` still works.
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});

const get = vi.mocked(axios.get);

afterEach(() => vi.clearAllMocks());

describe("getStopSchedule (HTTP wiring)", () => {
  it("hits the GetTiemposParada URL with the stop and route ids", async () => {
    get.mockResolvedValue({ data: loadFixture("schedule-realtime.json") });
    await getStopSchedule("10336", "137");
    expect(get).toHaveBeenCalledWith(
      "https://www.moventis.es/api/json/GetTiemposParada/es/10336/137/0",
    );
  });

  it("parses a well-formed response", async () => {
    get.mockResolvedValue({ data: loadFixture("schedule-realtime.json") });
    const schedules = await getStopSchedule("10336", "137");
    expect(schedules).not.toBeNull();
    expect(schedules![0]!.externalLineId).toBe("137");
    expect(schedules![0]!.journeys[0]!.scheduledTimes[0]!.isRealTime).toBe(true);
  });

  it("filters the sentinel response to an empty list", async () => {
    get.mockResolvedValue({ data: loadFixture("schedule-sentinel.json") });
    expect(await getStopSchedule("1", "1")).toEqual([]);
  });

  it("returns null on a network error (never breaks the timetable)", async () => {
    get.mockRejectedValue(new AxiosError("network down"));
    expect(await getStopSchedule("1", "1")).toBeNull();
  });

  it("throws a TRPCError when the API response shape changed", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined); // expected diagnostic noise
    get.mockResolvedValue({ data: loadFixture("schedule-malformed.json") });
    await expect(getStopSchedule("1", "1")).rejects.toBeInstanceOf(TRPCError);
    err.mockRestore();
  });
});
