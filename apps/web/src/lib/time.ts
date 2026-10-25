import type { Lang } from "@moventis/shared";
import { mapCopy } from "@/i18n/copy/map";

/**
 * Formats seconds into a relative time string (e.g., "Now", "12 min", "1h 30m").
 *
 * `compact` drops to "12m" / "1h30" for the line strip in the drawer header,
 * where a dozen of these sit side by side in fixed-width pills and every
 * character is width the next line does not get. The trailing "m" goes once
 * an "h" is there to say what the digits are — with it, "1h30m" measured
 * 35.6px inside a 36px box, which is not a margin that survives a fallback
 * font. Everywhere else the roomier form reads better, so it stays the
 * default.
 */
export const formatRelativeTime = (
  seconds: number,
  lang: Lang,
  { compact = false }: { compact?: boolean } = {},
): string => {
  const t = mapCopy[lang].time;
  if (seconds < 30) return compact ? t.nowCompact : t.arriving;
  const totalMinutes = Math.round(seconds / 60);

  if (totalMinutes < 60) {
    return compact ? `${totalMinutes}m` : `${totalMinutes} min`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return compact ? `${hours}h${minutes}` : `${hours}h ${minutes}m`;
  }
};

/**
 * Formats a Date object into an absolute time string (e.g., "03:38").
 */
export const formatAbsoluteTime = (
  date: Date | null,
  lang: Lang,
): string | null => {
  if (!date) return null;
  return date.toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * Formats the last updated timestamp into a readable "ago" string.
 */
export const formatTimeAgo = (timestamp: number | null, lang: Lang): string => {
  const t = mapCopy[lang].time;
  if (!timestamp) return "";
  const now = Date.now();
  const secondsAgo = Math.round((now - timestamp) / 1000);

  if (secondsAgo < 10) return t.agoNow;
  if (secondsAgo < 60) return t.agoSeconds(secondsAgo);
  const minutesAgo = Math.floor(secondsAgo / 60);
  return t.agoMinutes(minutesAgo);
};
