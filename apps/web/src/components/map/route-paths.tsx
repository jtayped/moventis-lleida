import { useEffect, useMemo } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useBusFinder } from "@/context/buses";
import { api } from "@/trpc/react";
import { computeOffsetLayers, type LineInput } from "@/lib/route-offsets";

/**
 * Draws the aggregated route geometry of every selected line on the map.
 *
 * All selected lines are fetched together so their geometry can be offset into
 * parallel "stripes": where multiple selected lines share a street, each colour
 * sits side-by-side instead of overlapping (see {@link computeOffsetLayers}).
 * A solo line stays centred on the road.
 *
 * Each line's offset geometry is rendered as one GeoJSON MultiLineString on its
 * own `google.maps.Data` layer — one feature regardless of how many polyline
 * fragments the line has. GeoJSON uses [lng, lat] order, matching how the
 * coordinates are stored.
 */
const RoutePaths = () => {
  const { selectedRoutes, routes } = useBusFinder();
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");

  const results = api.useQueries((t) =>
    selectedRoutes.map((code) =>
      t.routes.getPath({ code }, { staleTime: Infinity }),
    ),
  );

  // Build offset stripe geometry. Recomputed only when the selection or the set
  // of loaded geometry changes (query data references are stable while cached).
  const signature = selectedRoutes
    .map((code, i) => `${code}:${results[i]?.data?.paths.length ?? 0}`)
    .join(",");

  const layers = useMemo(() => {
    const lines: LineInput[] = [];
    selectedRoutes.forEach((code, i) => {
      const data = results[i]?.data;
      if (!data?.paths.length) return;
      const color = routes.find((r) => r.code === code)?.color ?? "#1571FD";
      lines.push({ code, color, paths: data.paths });
    });
    return computeOffsetLayers(lines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, routes]);

  useEffect(() => {
    if (!map || !mapsLib || !layers.length) return;

    const dataLayers = layers.map((layer) => {
      const d = new mapsLib.Data();
      d.addGeoJson({
        type: "Feature",
        geometry: { type: "MultiLineString", coordinates: layer.paths },
        properties: {},
      });
      d.setStyle({
        strokeColor: layer.color,
        strokeWeight: 4,
        strokeOpacity: 0.9,
        clickable: false,
      });
      d.setMap(map);
      return d;
    });

    return () => dataLayers.forEach((d) => d.setMap(null));
  }, [map, mapsLib, layers]);

  return null;
};

export default RoutePaths;
