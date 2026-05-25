import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/time";

/**
 * A component that displays a live countdown for an arriving bus.
 */
const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.round((targetDate.getTime() - Date.now()) / 1000),
  );

  useEffect(() => {
    setSecondsRemaining(Math.round((targetDate.getTime() - Date.now()) / 1000));
  }, [targetDate]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining <= 0]);

  if (secondsRemaining < 30) return <>Now</>;
  if (secondsRemaining < 60 * 10) {
    const m = Math.floor(secondsRemaining / 60);
    const s = secondsRemaining % 60;
    return <>{`${m}:${s.toString().padStart(2, "0")}`}</>;
  }
  return <>{formatRelativeTime(secondsRemaining)}</>;
};

export default CountdownTimer;
