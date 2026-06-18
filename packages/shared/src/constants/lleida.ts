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
