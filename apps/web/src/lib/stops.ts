/**
 * How long a stop counts as new. Lives here because two surfaces read it — the
 * pin's mark on the map and the drawer notice that explains what the mark means —
 * and a threshold copied into both would drift.
 */
export const NEW_STOP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function isNewStop(
  createdAt: Date | string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!createdAt) return false;
  return now - new Date(createdAt).getTime() < NEW_STOP_WINDOW_MS;
}
