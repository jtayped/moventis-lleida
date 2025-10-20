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

const padding = 0.035;
export const RESTRICTED_BOUNDS = {
  north: 41.635 + padding,
  south: 41.605 - padding,
  east: 0.645 + padding,
  west: 0.6 - padding,
} as const;
