import { z } from "zod";

/**
 * An inferred real-time bus position, returned from `buses.byLine`.
 *
 * The Moventis API exposes no GPS. A position is derived by bracketing: the bus
 * is listed among the real-time arrivals at `segment.toStopId` and not at
 * `segment.fromStopId`, so it is somewhere between the two. `lat`/`lng` is a
 * point estimate inside that bracket from its ETA to the downstream stop; the
 * bracket itself is the claim, and `confidence` says how narrow it is.
 */
export const busPositionSchema = z.object({
  /** Line code this bus runs, e.g. "7" — drives the marker colour. */
  lineCode: z.string(),
  /** Normalized journey (destination) key the bus is running, e.g. "caparrella - llívia". */
  journeyName: z.string(),
  /** Variant direction: "I" = outbound (ida), "V" = return (vuelta). */
  direction: z.enum(["I", "V"]),
  lat: z.number(),
  lng: z.number(),
  /**
   * The bracket the bus is in, as the two bounding stops' DB ids (travel order).
   * Not always adjacent stops: the locator probes a subset and narrows only as
   * far as its budget allows — see `spanStops`.
   */
  segment: z.object({ fromStopId: z.string(), toStopId: z.string() }),
  /** How many stop-to-stop segments the bracket spans; 1 means adjacent stops. */
  spanStops: z.number().int().min(1),
  /** Fraction of the bracket already travelled, 0..1 (an estimate from the ETA). */
  fraction: z.number().min(0).max(1),
  /** ETA until the bus reaches `segment.toStopId`, in seconds. */
  etaSeconds: z.number(),
  /**
   * "high": bracketed between adjacent stops. "medium": a wider bracket whose
   * travel time was measured from other buses, so the point inside it is
   * interpolated on time. "low": a wider bracket with no measurement — the point
   * is a guess at a fixed speed, only the bracket is trustworthy.
   */
  confidence: z.enum(["high", "medium", "low"]),
});
