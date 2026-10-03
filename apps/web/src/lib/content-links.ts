/**
 * The site's content pages, in the order every link list shows them.
 *
 * One list for the content footer, the link row at the bottom of the map's
 * desktop column and the settings panel, so a page added here is linked from
 * all three. Only pages that exist go in: a link to a 404 is worse for crawling
 * than no link.
 */
export const CONTENT_LINKS = [
  { href: "/linies", label: "línies i horaris" },
  { href: "/parades", label: "parades" },
  { href: "/informacio", label: "informació" },
  { href: "/tarifes", label: "tarifes" },
  { href: "/privadesa", label: "privadesa" },
] as const;
