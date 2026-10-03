/**
 * The site's content pages, in the order every link list shows them.
 *
 * One list for the content footer and the settings panel, so a page added
 * here is linked from both. The map's desktop bar (`DesktopNav`) has its own
 * shorter list with icons; add a page there too if it belongs on the map. Only pages that exist go in: a link to a 404 is worse for crawling
 * than no link.
 */
export const CONTENT_LINKS = [
  { href: "/linies", label: "línies i horaris" },
  { href: "/parades", label: "parades" },
  { href: "/informacio", label: "informació" },
  { href: "/tarifes", label: "tarifes" },
  { href: "/privadesa", label: "privadesa" },
] as const;
