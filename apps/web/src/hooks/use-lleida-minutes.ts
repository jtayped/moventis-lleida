"use client";

import { useEffect, useState } from "react";
import { lleidaMinutes } from "@/lib/service-time";

/**
 * The current minute in Lleida, ticking every 30 s. Null on the server and on
 * the first client render, so a server-rendered timetable and its hydrated copy
 * agree, and "next bus" marks appear only once the browser knows the time.
 */
export function useLleidaMinutes(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(lleidaMinutes());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
