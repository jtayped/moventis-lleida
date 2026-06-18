import { useState, useEffect, useCallback, useRef } from "react";

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

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: "unsupported", position: null, error: null });
      return;
    }

    setShouldPan(true);

    if (watchIdRef.current !== null) return;

    setState((s) => ({ ...s, status: "loading" }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setState({ status: "active", position: coords, error: null });
      },
      (error) => {
        setState({ status: "error", position: null, error });
        watchIdRef.current = null;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, []);

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
