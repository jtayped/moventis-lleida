/**
 * The zone every Moventis clock time is expressed in. Servers run in UTC, so this
 * can never be left to the host's local zone — see `packages/api/src/lib/zoned-time.ts`.
 */
export const TIME_ZONE = "Europe/Madrid";

export const COORDINATES = {
  lat: 41.6176,
  lng: 0.62,
} as const;

export const INITIAL_BOUNDS = {
  north: 41.635,
  south: 41.605,
  east: 0.645,
  west: 0.6,
} as const;

// Covers all intercity lines: Alcarràs (NW), Torres de Segre (SE),
// el Cogul & l'Albagés (S) — roughly 35 km from city centre.
export const RESTRICTED_BOUNDS = {
  north: 41.80,
  south: 41.38,
  east: 0.96,
  west: 0.46,
} as const;
