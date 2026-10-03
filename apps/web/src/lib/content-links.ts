import { BusFront, Info, MapPin, Shield, Ticket } from "lucide-react";

/**
 * The site's content pages, in the order every link list shows them.
 *
 * One list for the content footer and the map's settings panel, so a page
 * added here is linked from both. The map's own bars (`components/map/nav`)
 * keep shorter lists of their own. Only pages that exist go in: a link to a
 * 404 is worse for crawling than no link.
 *
 * `BusFront` for línies matches the map's línies door.
 */
export const CONTENT_LINKS = [
  { href: "/linies", label: "línies i horaris", icon: BusFront },
  { href: "/parades", label: "parades", icon: MapPin },
  { href: "/informacio", label: "informació", icon: Info },
  { href: "/tarifes", label: "tarifes", icon: Ticket },
  { href: "/privadesa", label: "privadesa", icon: Shield },
] as const;
