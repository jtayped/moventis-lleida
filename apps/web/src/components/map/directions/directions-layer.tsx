"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import type { DirectionsPoint, ItineraryLeg, LngLat } from "@moventis/shared";

import { useDirections } from "@/context/directions";
import type { DirectionsPlanState } from "@/hooks/use-directions-plan";
import { PANEL_WIDTH_PX } from "@/hooks/use-is-desktop";
import { useSettings } from "@/hooks/use-settings";
import { track } from "@/lib/analytics";

/** Share of a phone's height the itinerary card can take (`max-h-[45vh]`). */
const PHONE_CARD_SHARE = 0.45;
/** The phone's top summary card, plus its margin. */
const PHONE_TOP_PX = 96;

const toLatLng = ([lng, lat]: LngLat) => ({ lat, lng });

/**
 * The chosen itinerary on the map: each bus leg in its line's colour over a
 * dark casing (line 1 is yellow, and a yellow line on a pale map needs an
 * edge), each walk dotted grey, and the two ends marked. While nothing is
 * chosen, desktop previews the first option — there is room beside the list
 * to see it — and a phone draws nothing, since the list covers the map.
 */
const DirectionsLayer = ({
  plan,
  isDesktop,
}: {
  plan: DirectionsPlanState;
  isDesktop: boolean;
}) => {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const coreLib = useMapsLibrary("core");
  const { resolvedTheme } = useSettings();
  const d = useDirections();

  const data = plan.query?.data;
  const shown = useMemo(() => {
    if (!d.isOpen || d.picking || !data) return null;
    const chosen = data.itineraries.find((i) => i.id === d.selectedId);
    if (chosen) return chosen.legs;
    if (!isDesktop) return null;
    if (data.itineraries[0]) return data.itineraries[0].legs;
    return data.walkOnly ? [data.walkOnly] : null;
  }, [d.isOpen, d.picking, d.selectedId, data, isDesktop]);
  const shownKey = d.selectedId ?? data?.itineraries[0]?.id ?? "walk";

  const walkColor = resolvedTheme === "dark" ? "#a1a1aa" : "#52525b";

  useEffect(() => {
    if (!map || !mapsLib || !shown) return;
    const lines: google.maps.Polyline[] = [];
    const draw = (opts: google.maps.PolylineOptions) =>
      lines.push(new mapsLib.Polyline({ map, clickable: false, ...opts }));
    for (const leg of shown) {
      const path = leg.path.map(toLatLng);
      if (leg.kind === "bus") {
        draw({
          path,
          strokeColor: "#000000",
          strokeOpacity: 0.3,
          strokeWeight: 9,
          zIndex: 30,
        });
        draw({
          path,
          strokeColor: leg.color,
          strokeOpacity: 1,
          strokeWeight: 6,
          zIndex: 31,
        });
      } else {
        draw({
          path,
          strokeOpacity: 0,
          zIndex: 32,
          icons: [
            {
              icon: {
                path: "M 0,-1 0,1",
                strokeColor: walkColor,
                strokeOpacity: 1,
                strokeWeight: 3,
                scale: 2,
              },
              offset: "0",
              repeat: "10px",
            },
          ],
        });
      }
    }
    return () => lines.forEach((l) => l.setMap(null));
  }, [map, mapsLib, shown, walkColor]);

  // Frame the route once per newly shown option — not on every refetch, which
  // would yank the map back each minute while someone is panning along it.
  // `shown` changes identity on every refetch, so the effect keys on the
  // option's id and reads the legs through a ref kept current just above it
  // (effects run in declaration order).
  const shownRef = useRef(shown);
  useEffect(() => {
    shownRef.current = shown;
  });
  const hasShown = shown !== null;
  useEffect(() => {
    const legs = shownRef.current;
    if (!map || !coreLib || !legs) return;
    const bounds = new coreLib.LatLngBounds();
    for (const leg of legs)
      for (const p of leg.path) bounds.extend(toLatLng(p));
    if (bounds.isEmpty()) return;
    map.fitBounds(
      bounds,
      isDesktop
        ? { top: 48, bottom: 48, right: 48, left: PANEL_WIDTH_PX + 48 }
        : {
            top: PHONE_TOP_PX,
            bottom: Math.round(window.innerHeight * PHONE_CARD_SHARE) + 24,
            left: 32,
            right: 32,
          },
    );
  }, [map, coreLib, shownKey, hasShown, isDesktop]);

  if (!shown || !plan.fromPoint || !plan.toPoint) return null;
  return (
    <>
      <EndMarker point={plan.fromPoint} kind="from" />
      <EndMarker point={plan.toPoint} kind="to" />
      {shown.flatMap((leg, i) => stopMarkers(leg, i))}
    </>
  );
};

const EndMarker = ({
  point,
  kind,
}: {
  point: DirectionsPoint;
  kind: "from" | "to";
}) => (
  <AdvancedMarker
    position={point}
    zIndex={40}
    title={kind === "from" ? "origen" : "destinació"}
  >
    {kind === "from" ? (
      <div className="size-4 rounded-full border-[3px] border-zinc-900 bg-white shadow-md dark:border-white dark:bg-zinc-900" />
    ) : (
      <div className="flex flex-col items-center">
        <div className="bg-destructive size-5 rounded-full border-[3px] border-white shadow-md" />
        <div className="bg-destructive -mt-0.5 h-2 w-0.5" />
      </div>
    )}
  </AdvancedMarker>
);

/** Where each bus leg is boarded and left, in the line's colour. */
function stopMarkers(leg: ItineraryLeg, i: number) {
  if (leg.kind !== "bus") return [];
  return [leg.from, leg.to].map((stop, j) => (
    <AdvancedMarker
      key={`${i}-${j}`}
      position={{ lat: stop.lat, lng: stop.lng }}
      zIndex={35}
      title={stop.name}
    >
      <div
        className="size-3.5 rounded-full border-[3px] bg-white shadow"
        style={{ borderColor: leg.color }}
      />
    </AdvancedMarker>
  ));
}

/**
 * While a field is being picked on the map, a tap on the map fills it. A tap
 * on a stop pin does too, but that is handled by the pins themselves.
 */
export const MapPointPicker = () => {
  const map = useMap();
  const { picking, setPlace } = useDirections();

  useEffect(() => {
    if (!map || !picking) return;
    map.setOptions({ draggableCursor: "crosshair" });
    const listener = map.addListener(
      "click",
      (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        track("directions place chosen", { field: picking, kind: "pin" });
        setPlace(picking, {
          kind: "pin",
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        });
      },
    );
    return () => {
      listener.remove();
      map.setOptions({ draggableCursor: null });
    };
  }, [map, picking, setPlace]);

  return null;
};

export default DirectionsLayer;
