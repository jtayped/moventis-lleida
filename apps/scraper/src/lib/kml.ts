/**
 * Extracts the first <coordinates> block from a KML document and returns
 * an array of [lng, lat] pairs. The KML altitude component is discarded.
 */
export function parseKmlPath(kml: string): [number, number][] {
  const match = kml.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
  if (!match?.[1]) return [];
  return match[1]
    .trim()
    .split(/\s+/)
    .map((coord) => {
      const [lngStr, latStr] = coord.split(",");
      const lng = parseFloat(lngStr ?? "");
      const lat = parseFloat(latStr ?? "");
      return [lng, lat] as [number, number];
    })
    .filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat));
}
