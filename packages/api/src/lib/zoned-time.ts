import { TIME_ZONE } from "@moventis/shared";

/**
 * A clock reading in {@link TIME_ZONE} — the numbers a clock in Lleida shows,
 * carrying no offset of their own.
 */
export interface WallClock {
  year: number;
  /** 1-12, unlike `Date`'s 0-11 months. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Reads an absolute instant as the wall clock it shows in {@link TIME_ZONE}. */
export function toWallClock(instant: Date): WallClock {
  const parts = partsFormatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((p) => p.type === type)?.value;
    return value === undefined ? NaN : parseInt(value, 10);
  };

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/** Offset of {@link TIME_ZONE} from UTC in ms at `instant` (+2h under CEST, +1h under CET). */
function offsetAt(instant: Date): number {
  const { year, month, day, hour, minute, second } = toWallClock(instant);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  // formatToParts has no millisecond field, so measure against a truncated instant.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Inverse of {@link toWallClock}: the instant at which {@link TIME_ZONE} shows the
 * given wall clock. `day` may overflow its month (day 32 → the 1st of the next
 * month), matching `Date.UTC`.
 *
 * On the two irregular hours of the year, the spring-forward gap (a wall clock that
 * never happens) resolves to the same instant as the hour after it, and the
 * autumn-back repeat resolves to the second pass, once the clocks have gone back.
 */
export function fromWallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  // The offset we need is the one in force at the *result*, which isn't known yet:
  // guess with the offset at the naive instant, then confirm against the candidate.
  // The two differ only within an hour or so of a DST transition.
  const guessed = offsetAt(new Date(asIfUtc));
  const candidate = new Date(asIfUtc - guessed);
  const actual = offsetAt(candidate);
  return actual === guessed ? candidate : new Date(asIfUtc - actual);
}

/**
 * Midnight UTC of the calendar day `instant` falls on **in {@link TIME_ZONE}**.
 *
 * That mixed footing is deliberate: the scraper stores `OperatingDay.date` by
 * parsing a bare `YYYY-MM-DD`, which lands on midnight UTC, so a day-bounded query
 * has to be built the same way — while still asking which day it is in Lleida.
 */
export function utcStartOfLocalDay(instant: Date): Date {
  const { year, month, day } = toWallClock(instant);
  return new Date(Date.UTC(year, month - 1, day));
}
