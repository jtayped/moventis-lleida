import { z } from "zod";

/**
 * Schemas for the Moventis responses the scraper reads. `docs/moventis-api.md`
 * is the field reference; the recorded responses in `src/__fixtures__/` are
 * what these are tested against.
 *
 * Objects are not strict: Moventis adds keys without notice, and an unknown key
 * is no reason to fail a sync. Only the fields the scraper reads are required.
 * The rest are declared through {@link extra}, so a later change can start
 * reading one with a type already in place.
 */

/**
 * A field the scraper does not read yet. It is typed for later use, but a
 * value of an unexpected type reads as absent instead of rejecting the row: a
 * drift in a field nothing depends on must not cost a night's sync. Code that
 * starts reading one of these should make it a plain required field first.
 */
const extra = <T extends z.ZodTypeAny>(schema: T) =>
  schema.optional().catch(undefined);

/**
 * One row of the line feed (`/{lang}/moventis/{lang}/lines`): one line on one
 * operating day, for every Moventis zone.
 */
export const lineFeedRowSchema = z.object({
  /** Stored as `Route.externalId`; the id every per-line endpoint takes. */
  ID_LINEA: z.string(),
  /** Public line code, e.g. `"5"` or `"N1"`. */
  COD_LINEA: z.string(),
  DESC_LINEA: z.string(),
  /** `"2"` is Lleida. */
  ID_ZONA: z.string(),
  COLOR: z.string(),
  // `parseDateStr` slices this by position, so another format must fail here
  // rather than reach the database as an invalid date.
  DIAS_QUE_CIRCULA: z.string().regex(/^\d{8}$/),
  /**
   * Drupal node of the line page. Differs per language: line 1 is `86606` in
   * the es feed and `86607` in the ca feed.
   */
  nid: extra(z.string()),
  ID_SUBZONA: extra(z.string()),
  TREAL: extra(z.string()),
  FORMA: extra(z.string()),
  TEXT_COLOR: extra(z.string().nullable()),
  ID_EXPLOTADORA: extra(z.string()),
  ID_CONCESION: extra(z.string()),
  ID_GRUPO: extra(z.string()),
  ADAPTADA: extra(z.string()),
  /** Drupal node of the brand. Differs per language like `nid`. */
  MARCA: extra(z.string()),
});

export type MoventisLine = z.infer<typeof lineFeedRowSchema>;

/** `TrayectosDet[].Parada`: the stop itself. */
export const stopInfoSchema = z.object({
  DESC_PARADA: z.string(),
  /** Stored as `Stop.externalId`; the id `GetTiemposParada` takes. */
  ID_PARADA: z.number(),
  LATITUD: z.number(),
  LONGITUD: z.number(),
  /** The public stop code, e.g. `20318`. Not the same as `ID_PARADA`. */
  COD_PARADA: extra(z.number()),
  ID_GRUPO: extra(z.number()),
  ID_MUNICIPIO: extra(z.number()),
  MUNICIPIO: extra(z.string()),
  EXPLOTADORA: extra(z.string()),
  ID_ZONA: extra(z.number()),
  ZONA: extra(z.string().nullable()),
  ID_EXPLOTADORA: extra(z.number()),
  UTMX: extra(z.number()),
  UTMY: extra(z.number()),
  ID_SUBZONA: extra(z.number().nullable()),
  SUBZONA: extra(z.string().nullable()),
  CONCESIONES: extra(z.unknown()),
});

export type MoventisStopInfo = z.infer<typeof stopInfoSchema>;

/** One stop of a trayecto, in route order. */
export const variantStopSchema = z.object({
  // Never missing in a recorded response, but `syncVariant` skips a stop
  // without one, and that stays the behaviour rather than failing the response.
  Parada: stopInfoSchema.nullish(),
  /** Ascending, mostly in steps of 10, with odd values such as 91 and 105. */
  SECUENCIA: z.number(),
  /** The segment this stop belongs to. */
  ID_TRAYECTO: extra(z.number()),
  ID_PARADA: extra(z.number()),
  ID_GRUPO: extra(z.number()),
  ID_LINEA: extra(z.number()),
  /** Cumulative distance from the first stop, in km. */
  NKM_ORIGEN: extra(z.number()),
  SUBE_BAJA: extra(z.number()),
});

export type MoventisVariantStop = z.infer<typeof variantStopSchema>;

/** One trayecto (a variant of a line) from `GetTrayectos`. */
export const trayectoSchema = z.object({
  // Most lines send a bare number; line 6 sends an array even for a single
  // segment. Normalised to an array either way.
  ID_TRAYECTO: z
    .union([z.number(), z.array(z.number())])
    .transform((id) => (Array.isArray(id) ? id : [id])),
  ID_TRAYECTO_CONCAT: z.number().nullish(),
  DESC_TRAYECTO: z.string(),
  /** `"S"` for a main variant, `"N"` for a secondary one. */
  PRINCIPAL: z.string(),
  /** `"I"` outbound (ida), `"V"` return (vuelta). */
  SENTIDO: z.string(),
  TrayectosDet: z.array(variantStopSchema),
  ID_LINEA: extra(z.number()),
  ID_GRUPO: extra(z.number()),
  ID_TRAYECTO_SAE: extra(z.number()),
  DESC_REDUCIDA: extra(z.string()),
  /** First service, in minutes after the service day's midnight. */
  INI_TRAYECTO: extra(z.number()),
  /** Last service, same unit. Above 1440 when it runs past midnight. */
  FIN_TRAYECTO: extra(z.number()),
  COLOR: extra(z.string()),
  /** Not a loop flag: linear line 5 sends `"S"` too. */
  CIRCULAR: extra(z.string()),
  numLinea: extra(z.string()),
});

export type MoventisTrayecto = z.infer<typeof trayectoSchema>;

/**
 * A row carrying no `TrayectosDet` is the stub `GetTrayectos` answers with on a
 * date the line does not run: `[{ "numLinea": "717" }]`.
 */
function hasStops(row: unknown): boolean {
  return (
    typeof row === "object" &&
    row !== null &&
    Array.isArray((row as Record<string, unknown>).TrayectosDet)
  );
}

/**
 * The whole `GetTrayectos` response. Stub rows are dropped, so a non-operating
 * date parses to `[]`. Every other row must be a valid trayecto, or the whole
 * response is rejected.
 *
 * Rejecting is deliberate. A dropped variant would read as "this variant no
 * longer runs", and a complete sync deletes variants it did not see, along with
 * any stop only they served. A thrown error reads as an unreachable probe
 * instead, which the resolution layer treats as doubt and never prunes on.
 */
export const trayectosResponseSchema = z
  .array(z.unknown())
  .transform((rows) => rows.filter(hasStops))
  .pipe(z.array(trayectoSchema));

/**
 * One row of the network-wide service alerts feed
 * (`/{lang}/moventis/{lang}/incidencias`). An alert affecting several lines or
 * subzones comes as several rows sharing one `nid`.
 */
export const incidenciaSchema = z.object({
  /** Drupal node of the alert. Differs per language. */
  nid: z.string(),
  TITLE_INCIDENCIA: z.string(),
  RESUMEN_INCIDENCIA: z.string(),
  /** Matches a line feed `nid` fetched in the same language. */
  NID_LINEA: z.string(),
  /** Matches a line feed `MARCA` fetched in the same language. */
  NID_MARCA: z.string(),
  /** When the alert ends, as a `Europe/Madrid` wall clock. */
  ENDATE: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
  destacada: extra(z.string()),
  /** Line name, sometimes padded with trailing tabs. */
  TITLE_LINEA: extra(z.string()),
  CODE_LINEA: extra(z.string()),
  ID_SUBZONA: extra(z.string()),
  ID_ZONA: extra(z.string().nullable()),
});

export type MoventisIncidencia = z.infer<typeof incidenciaSchema>;
