import type { RoutePath } from "@moventis/shared";
import { cn } from "@/lib/utils";

/**
 * The line's route as a plain SVG, drawn on the server so the page needs no map
 * script and a crawler sees an image of the line.
 *
 * Longitude is scaled by cos(latitude) before fitting, or Lleida comes out
 * stretched sideways by a third. Coordinates are `[lng, lat]`, as stored. The
 * drawing keeps the route's own proportions inside a `width` × `maxHeight` box.
 * It strokes with `var(--line)`, so it sits inside an element carrying
 * `lineAccentStyle` and `LINE_ACCENT_CLASS`.
 */
export const RouteShape = ({
  path,
  label,
  width = 640,
  maxHeight = 260,
  strokeWidth = 4,
  className,
}: {
  path: RoutePath;
  /** Read out as the image's name. Omit for a decorative thumbnail. */
  label?: string;
  width?: number;
  maxHeight?: number;
  strokeWidth?: number;
  className?: string;
}) => {
  const lines = path.paths.filter((p) => p.length >= 2);
  const points = lines.flat();
  if (points.length === 0) return null;

  const pad = strokeWidth * 2;
  const lats = points.map(([, lat]) => lat);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map(([lng]) => lng * kx);
  const minX = Math.min(...xs);
  const maxY = Math.max(...lats);
  const spanX = Math.max(...xs) - minX || 1e-6;
  const spanY = maxY - Math.min(...lats) || 1e-6;

  const scale = Math.min(
    (width - pad * 2) / spanX,
    (maxHeight - pad * 2) / spanY,
  );
  const height = Math.ceil(spanY * scale + pad * 2);
  const offsetX = (width - spanX * scale) / 2;
  const toPoint = ([lng, lat]: [number, number]) =>
    `${(offsetX + (lng * kx - minX) * scale).toFixed(1)},${(pad + (maxY - lat) * scale).toFixed(1)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-auto w-full", className)}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      {lines.map((line, i) => (
        <polyline
          key={i}
          points={line.map(toPoint).join(" ")}
          fill="none"
          className="stroke-(--line)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};
