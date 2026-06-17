/**
 * Formats seconds into a relative time string (e.g., "Now", "12 min", "1h 30m").
 */
export const formatRelativeTime = (seconds: number): string => {
  if (seconds < 30) return "arribant";
  const totalMinutes = Math.round(seconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Formats a Date object into an absolute time string (e.g., "03:38").
 */
export const formatAbsoluteTime = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toLocaleTimeString("ca", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * Formats the last updated timestamp into a readable "ago" string.
 */
export const formatTimeAgo = (timestamp: number | null): string => {
  if (!timestamp) return "";
  const now = Date.now();
  const secondsAgo = Math.round((now - timestamp) / 1000);

  if (secondsAgo < 10) return "ara";
  if (secondsAgo < 60) return `fa ${secondsAgo}s`;
  const minutesAgo = Math.floor(secondsAgo / 60);
  return `fa ${minutesAgo}m`;
};
