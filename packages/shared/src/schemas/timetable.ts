import { z } from "zod";

/**
 * Raw `GetParadas/{line}/{trayecto}/{YYYYMMDD}/0` — one service day of one
 * trayecto, as the Moventis "tabla horaria" page reads it.
 *
 * Each row is one stop of the trayecto. `hora[k]` is the time trip
 * `IdExpedicion[k]` passes it, as a Lleida wall clock. Only the fields the
 * timetable needs are declared; zod drops the rest.
 *
 * Intentionally strict about those fields: a changed shape should fail the
 * nightly sync loudly (and the live canary) rather than store a wrong day.
 */
const paradasStopSchema = z.object({
  /** `"<Stop.externalId>-<n>"`, e.g. `"10244-10"`. */
  COD_PARADA: z.string(),
  secuencia: z.number(),
  hora: z.array(z.string().regex(/^\d{1,2}:\d{2}$/)),
  IdExpedicion: z.array(z.number().int()),
});

/**
 * The day carries no service. Seen as `IdExpedicion: ["S"]` with every other
 * field `"S"` or null (a date outside the published calendar).
 */
const paradasSentinelSchema = z.object({
  IdExpedicion: z.array(z.literal("S")),
});

const paradasRowSchema = z.union([paradasStopSchema, paradasSentinelSchema]);

export type ParadasStop = z.infer<typeof paradasStopSchema>;
export type ParadasRow = z.infer<typeof paradasRowSchema>;

/** Always a row list: the `{}` answer is read as an empty one. */
export const paradasResponseSchema = z.union([
  z.array(paradasRowSchema),
  // A trayecto that does not run that day, or does not exist, answers `{}`.
  z
    .object({})
    .strict()
    .transform((): ParadasRow[] => []),
]);

/**
 * One trayecto's service day, as stored in `Timetable` (`stops`, `trips`,
 * `unpaired` columns) and as every reader gets it back.
 *
 * - `stops`: `Stop.externalId` in sequence order. A stop can appear twice — a
 *   loop's terminal is both its first and last position.
 * - `trips`: one entry per Moventis trip id (`IdExpedicion`), with one slot per
 *   position in `stops`: minutes after the service day's midnight, above 1440
 *   past midnight (n1), or null where the trip does not pass. Trips are stored
 *   raw: on a loop one id can carry another bus's times at the closing stops,
 *   and a concatenated variant's two trayectos use different ids for one bus.
 *   Splitting and stitching are the reader's job.
 * - `unpaired`: stops whose `hora` and `IdExpedicion` lists disagree in length
 *   (`hora` lists a minute once even when two trips share it), so their times
 *   cannot be assigned to trips by index. Their column is null in every trip,
 *   and their own ascending departure list is kept here instead. A stop
 *   timetable reads both: the stop's column at its paired positions, plus
 *   `unpaired` at the others.
 */
export const storedTimetableSchema = z
  .object({
    stops: z.array(z.string()),
    trips: z.array(
      z.object({
        id: z.number().int(),
        times: z.array(z.number().int().nullable()),
      }),
    ),
    unpaired: z
      .array(
        z.object({
          position: z.number().int().nonnegative(),
          times: z.array(z.number().int()),
        }),
      )
      .optional(),
  })
  .refine(
    (t) => t.trips.every((trip) => trip.times.length === t.stops.length),
    {
      message: "every trip has exactly one slot per stop",
    },
  );

export type StoredTimetable = z.infer<typeof storedTimetableSchema>;
