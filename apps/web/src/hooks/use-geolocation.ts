import { useState, useEffect, useCallback, useRef } from "react";

import { track } from "@/lib/analytics";

export type GeolocationStatus = "idle" | "loading" | "active" | "error" | "unsupported";

interface GeolocationState {
  status: GeolocationStatus;
  position: GeolocationCoordinates | null;
  error: GeolocationPositionError | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    status: "idle",
    position: null,
    error: null,
  });
  const [shouldPan, setShouldPan] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // How the ask ended, reported once per watch. `watchPosition` keeps calling
  // back for as long as the device moves, and every one of those callbacks
  // resolves to "active" again — without this, a walk down the street would
  // count as dozens of separate location requests.
  const reportedRef = useRef(false);
  const reportOutcome = useCallback(
    (result: "active" | "error" | "unsupported") => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      track("location requested", { result });
    },
    [],
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: "unsupported", position: null, error: null });
      reportOutcome("unsupported");
      return;
    }

    setShouldPan(true);

    // Already watching: this click only re-centres the map, and the outcome was
    // reported when the watch started.
    if (watchIdRef.current !== null) return;

    setState((s) => ({ ...s, status: "loading" }));
    reportedRef.current = false;

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setState({ status: "active", position: coords, error: null });
        reportOutcome("active");
      },
      (error) => {
        setState({ status: "error", position: null, error });
        watchIdRef.current = null;
        reportOutcome("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, [reportOutcome]);

  const onPanned = useCallback(() => setShouldPan(false), []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { ...state, shouldPan, requestLocation, onPanned };
}
