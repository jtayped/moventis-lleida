import type { DirectionsPlace } from "@/context/directions";
import { formatAbsoluteTime } from "@/lib/time";
import type { Lang } from "@moventis/shared";
import { directionsCopy } from "@/i18n/copy/directions";

export const clock = (d: Date, lang: Lang): string =>
  formatAbsoluteTime(d, lang) ?? "";

/** "22 min", "1 h 5 min". */
export function duration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "350 m", "1,2 km" — walking is an estimate, so it is rounded like one. */
export function distance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

export function placeLabel(
  place: DirectionsPlace | null,
  lang: Lang,
): string | null {
  if (!place) return null;
  const t = directionsCopy[lang];
  if (place.kind === "location") return t.myLocation;
  if (place.kind === "stop") return place.name;
  return t.mapPoint;
}

/**
 * Where a bus is heading. Moventis names variants "origin - destination"
 * ("pla d'urgell - arnau de vilanova"), and "direcció <both>" reads as two
 * places; the last one is the direction. Loops have no dash and stay whole.
 */
export function towards(headsign: string): string {
  const parts = headsign.split(" - ");
  return parts[parts.length - 1]!.trim();
}
