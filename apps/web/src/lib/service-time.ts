import type { DayType, ServiceDays } from "@moventis/api";
import { TIME_ZONE, type Lang } from "@moventis/shared";
import { contentCopy } from "@/i18n/copy/content";

/** The day types in the order every timetable shows them. */
export const DAY_TYPE_ORDER: DayType[] = ["weekday", "saturday", "sunday"];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A timetable minute as a clock, `"06:55"`. Times past midnight are stored
 * past 1440 (n1 runs to 1710) and read as the next morning's clock.
 */
export const formatServiceTime = (minutes: number): string => {
  const clock = minutes % (24 * 60);
  return `${pad(Math.floor(clock / 60))}:${pad(clock % 60)}`;
};

/** The hour a timetable minute falls in, as printed: 25 is "01". */
export const serviceHour = (minutes: number): number =>
  Math.floor(minutes / 60);

const dateFormats = new Map<Lang, Intl.DateTimeFormat>();

const dateFormat = (lang: Lang) => {
  let format = dateFormats.get(lang);
  if (!format) {
    format = new Intl.DateTimeFormat(lang, {
      weekday: "long",
      day: "numeric",
      month: "long",
      // A bare calendar date, read at UTC midnight where it means itself.
      timeZone: "UTC",
    });
    dateFormats.set(lang, format);
  }
  return format;
};

/** `"2026-10-05"` → `"dilluns 5 d'octubre"`, with a straight apostrophe. */
export const formatServiceDate = (date: string, lang: Lang): string => {
  const parts = dateFormat(lang).formatToParts(new Date(`${date}T00:00:00Z`));
  const index = (type: Intl.DateTimeFormatPartTypes) =>
    parts.findIndex((p) => p.type === type);
  const weekday = parts[index("weekday")]?.value ?? "";
  // Day through month, literals included: Catalan folds its "d'" into the
  // month ("d’octubre"), Spanish puts " de " in a literal between the two.
  const dayMonth = parts
    .slice(index("day"), index("month") + 1)
    .map((p) => p.value)
    .join("");
  return `${weekday} ${dayMonth}`.replace(/’/g, "'");
};

/**
 * Which dates the times on a page come from, as a sentence fragment:
 * "el dilluns 5 d'octubre, el dissabte 3 d'octubre i el diumenge 4 d'octubre".
 */
export const describeServiceDays = (
  days: ServiceDays,
  lang: Lang,
): string | null => {
  const t = contentCopy[lang];
  const dates = DAY_TYPE_ORDER.flatMap((type) => {
    const date = days[type];
    return date ? [t.onDate(formatServiceDate(date, lang))] : [];
  });
  return dates.length > 0 ? t.joinList(dates) : null;
};

/**
 * `"n1 magraners - secà - balàfia"` → `"magraners - secà - balàfia"`. Moventis
 * names the night line with its own code, which would read "línia n1 n1 ...".
 */
export const lineDisplayName = (code: string, name: string): string =>
  name.startsWith(`${code} `) ? name.slice(code.length + 1) : name;

const lleidaWeekday = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: TIME_ZONE,
});

/** Which day type today is in Lleida; the server runs in UTC. */
export const todayDayType = (now = new Date()): DayType => {
  const weekday = lleidaWeekday.format(now);
  if (weekday === "Sat") return "saturday";
  if (weekday === "Sun") return "sunday";
  return "weekday";
};

const lleidaClock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

/** Minutes after Lleida's midnight at `now`: the footing timetable times use. */
export const lleidaMinutes = (now = new Date()): number => {
  const [hour, minute] = lleidaClock.format(now).split(":").map(Number);
  return hour! * 60 + minute!;
};
