import { formatTimeAgo } from "@/lib/time";
import { useEffect, useState } from "react";
import { useLang } from "@/i18n/lang-context";
import { stopDetailsCopy } from "@/i18n/copy/stop-details";

/**
 * Displays the "Updated X ago" message and auto-updates it.
 */
const LastUpdated = ({ timestamp }: { timestamp: number | null }) => {
  const lang = useLang();
  const t = stopDetailsCopy[lang];
  const [displayTime, setDisplayTime] = useState(() =>
    formatTimeAgo(timestamp, lang),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime(formatTimeAgo(timestamp, lang));
    }, 5000);

    return () => clearInterval(interval);
  }, [timestamp, lang]);

  if (!timestamp) return null;

  return (
    <span className="text-muted-foreground text-[11px]">
      {t.lastUpdated} {displayTime}
    </span>
  );
};

export default LastUpdated;
