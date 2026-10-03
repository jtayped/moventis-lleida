/**
 * The Moventis timetable, from the wire to what `Timetable` stores and back.
 *
 * `GetParadas` answers per stop (time list + trip-id list); a journey planner
 * and a stop page both want it per trip, or per stop with the trip ids
 * trusted. This is the one place that turns one into the other, and the one
 * place a stored row is read back, so the scraper and every reader agree on
 * what a row means. The quirks it absorbs, all seen in live responses:
 *
 * - **Times wrap at midnight.** n1's Saturday service lists `23:00 … 00:00 …
 *   05:15`. Times are stored as minutes after the service day's midnight and
 *   unwrapped past 1440, which is also the convention `GetTrayectos` uses for
 *   `INI_TRAYECTO`/`FIN_TRAYECTO`.
 * - **A stop's two lists can disagree in length.** `hora` lists each minute
 *   once, so two trips passing in the same minute leave `IdExpedicion` one
 *   longer (line 7, GARRIGUES/BLOCS LA CAIXA: 79 times, 80 ids); some stops
 *   also list ids of trips that do not stop there (line 7, PLAÇA ESPANYA/
 *   SARACIBAR: 78 times, 101 ids). Index-wise pairing is then wrong from the
 *   first collapsed minute on — as it is if a trip id repeats at one stop — so
 *   that stop is left out of every trip and its own departure list is kept
 *   under `unpaired`. About a third of a day's rows have at least one such
 *   stop. A reader that needs trip times there can place each trip between
 *   its neighbouring stops' times; the stored row never guesses.
 * - **No service is not an error.** A day the trayecto does not run answers
 *   `{}` or a stub row of `"S"` placeholders; both parse to an empty day.
 *
 * What it deliberately does not do is split or stitch trips: see
 * {@link StoredTimetable}.
 */

import {
  paradasResponseSchema,
  storedTimetableSchema,
  type ParadasRow,
  type ParadasStop,
  type StoredTimetable,
} from "../schemas/timetable";

const DAY_MIN = 24 * 60;

/**
 * A time this much earlier than the one before it has crossed midnight. Half a
 * day: a loop's closing stops legitimately carry times ~30 min *earlier* than
 * the trip's previous stop (another bus's pull-in), and those must stay as they
 * are.
 */
const WRAP_THRESHOLD_MIN = DAY_MIN / 2;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
}

/** Make an in-order list of clock minutes non-decreasing across midnight. */
function unwrap<T extends number | null>(minutes: T[]): T[] {
  let offset = 0;
  let prev = -Infinity;
  return minutes.map((m) => {
    if (m === null) return m;
    let v = m + offset;
    while (v < prev - WRAP_THRESHOLD_MIN) {
      offset += DAY_MIN;
      v += DAY_MIN;
    }
    prev = v;
    return v as T;
  });
}

/** `"10244-10"` → `"10244"` (`Stop.externalId`). */
function stopExternalId(codParada: string): string {
  return codParada.split("-")[0]!;
}

const isStopRow = (row: ParadasRow): row is ParadasStop => "COD_PARADA" in row;

const firstTime = (times: (number | null)[]): number =>
  times.find((t): t is number => t !== null) ?? Infinity;

/**
 * Parse a raw `GetParadas` response into the stored shape.
 *
 * Throws a `ZodError` when the response is not a shape we know — a contract
 * change, which the caller should treat as a failed fetch, never as "no
 * service". A day without service comes back with empty `stops` and `trips`.
 */
export function parseParadasResponse(raw: unknown): StoredTimetable {
  const rows = paradasResponseSchema.parse(raw).filter(isStopRow);
  if (rows.length === 0) return { stops: [], trips: [] };

  const ordered = [...rows].sort((a, b) => a.secuencia - b.secuencia);
  const stops = ordered.map((r) => stopExternalId(r.COD_PARADA));
  const byTrip = new Map<number, (number | null)[]>();
  const unpaired: { position: number; times: number[] }[] = [];

  ordered.forEach((row, position) => {
    // The stop's list is in service order, so unwrapping it here places every
    // time on the right day even before the trips are assembled.
    const minutes = unwrap(row.hora.map(toMinutes));
    const paired =
      row.hora.length === row.IdExpedicion.length &&
      new Set(row.IdExpedicion).size === row.IdExpedicion.length;
    if (!paired) {
      unpaired.push({ position, times: [...minutes].sort((a, b) => a - b) });
      return;
    }
    row.IdExpedicion.forEach((id, k) => {
      let times = byTrip.get(id);
      if (!times) {
        times = new Array<number | null>(stops.length).fill(null);
        byTrip.set(id, times);
      }
      times[position] = minutes[k]!;
    });
  });

  const trips = [...byTrip]
    // A stop whose own list starts after midnight cannot tell it apart from the
    // morning; the trip's earlier stops can.
    .map(([id, times]) => ({ id, times: unwrap(times) }))
    .sort((a, b) => firstTime(a.times) - firstTime(b.times) || a.id - b.id);

  return unpaired.length > 0 ? { stops, trips, unpaired } : { stops, trips };
}

/**
 * Read a `Timetable` row back. The single read path for every consumer, so a
 * row the schema no longer accepts is skipped in one place (`null`) rather than
 * half-read in several.
 */
export function readStoredTimetable(row: {
  stops: unknown;
  trips: unknown;
  unpaired: unknown;
}): StoredTimetable | null {
  const result = storedTimetableSchema.safeParse({
    stops: row.stops,
    trips: row.trips,
    unpaired: row.unpaired ?? undefined,
  });
  return result.success ? result.data : null;
}
