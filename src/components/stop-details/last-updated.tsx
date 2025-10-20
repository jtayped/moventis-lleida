import { formatTimeAgo } from "@/lib/time";
import { useEffect, useState } from "react";

/**
 * Displays the "Updated X ago" message and auto-updates it.
 */
const LastUpdated = ({ timestamp }: { timestamp: number | null }) => {
  const [displayTime, setDisplayTime] = useState(formatTimeAgo(timestamp));

  useEffect(() => {
    setDisplayTime(formatTimeAgo(timestamp));
    const interval = setInterval(() => {
      setDisplayTime(formatTimeAgo(timestamp));
    }, 5000);

    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return null;

  return (
    <span className="text-muted-foreground text-xs">
      actualitzat {displayTime}
    </span>
  );
};

export default LastUpdated;
