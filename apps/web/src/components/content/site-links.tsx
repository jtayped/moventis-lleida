import { Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { FOCUS_RING } from "@/components/content/styles";
import { CONTENT_LINKS } from "@/lib/content-links";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "mapa en directe", icon: MapIcon },
  ...CONTENT_LINKS,
];

/**
 * Every page of the site as a grid of icon links: the map, then
 * `CONTENT_LINKS`. The content footer and the map's settings panel both draw
 * it, so a page added to `CONTENT_LINKS` turns up in both.
 */
export const SiteLinks = ({
  label,
  className,
}: {
  /** The nav's accessible name, which differs by where it sits. */
  label: string;
  className?: string;
}) => (
  <nav aria-label={label} className={className}>
    <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
      {LINKS.map(({ href, label: text, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm transition-colors",
              FOCUS_RING,
            )}
          >
            <Icon size={16} aria-hidden className="shrink-0" />
            {text}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);
