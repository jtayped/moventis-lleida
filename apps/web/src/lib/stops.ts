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

/**
 * `"passarel·la camps elisis 2"` → `"passarella-camps-elisis-2"`. Accents and
 * the punt volat go, everything else that is not a letter or digit becomes one
 * hyphen.
 */
export const slugify = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/·/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * A stop page's path: `/parades/10242-placa-espanya-saracibar`. The id leads
 * and is what the page looks up; the name is for people and search engines,
 * and a page reached with an old or missing name redirects to this one.
 */
export const stopPath = (stop: { externalId: string; name: string }) => {
  const slug = slugify(stop.name);
  return `/parades/${stop.externalId}${slug ? `-${slug}` : ""}`;
};
