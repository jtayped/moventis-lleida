import { z } from "zod";

/**
 * An inferred real-time bus position, returned from `buses.byLine`.
 *
 * Positions are reconstructed from upstream arrival probes (the Moventis API
 * exposes no GPS), so each carries a `confidence` reflecting how it was derived.
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
  /** The segment the bus is on, as the two bounding stops' DB ids (travel order). */
  segment: z.object({ fromStopId: z.string(), toStopId: z.string() }),
  /** Fraction of the segment already travelled, 0..1. */
  fraction: z.number().min(0).max(1),
  /** ETA until the bus reaches its reference anchor (the variant terminal), in seconds. */
  etaSeconds: z.number(),
  confidence: z.enum(["high", "medium", "low"]),
});
