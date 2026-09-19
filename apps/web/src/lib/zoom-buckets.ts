/**
 * How much of a stop the map draws at a given zoom. Lives here rather than in
 * `pins-renderer.tsx` because the next-bus prefetcher has to fire on exactly the
 * bucket the pin renders its pill at — two copies of `16.5` would drift, and the
 * symptom would be requests spent on pins that show nothing.
 */
export type ZoomBucket = "small" | "medium" | "large";

export const getZoomBucket = (zoom: number): ZoomBucket => {
  if (zoom < 14) return "small";
  if (zoom < 16.5) return "medium";
  return "large";
};

/**
 * One step up the ladder, for pins that have to stay findable at any zoom.
 *
 * The `small` bucket is a 10px dot with nowhere to hang a shoulder mark, and the
 * default bounds are the whole city — so that is precisely the zoom at which a
 * saved stop would otherwise dissolve into the same faint speck as every stop the
 * user never asked for.
 */
export const promote = (bucket: ZoomBucket): ZoomBucket =>
  bucket === "small" ? "medium" : bucket;
