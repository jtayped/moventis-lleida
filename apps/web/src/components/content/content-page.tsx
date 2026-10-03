import { LayoutList, Map as MapIcon, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { AuthorCredit } from "@/components/content/author-credit";
import { FOCUS_RING } from "@/components/content/styles";
import { JsonLd } from "@/components/seo/json-ld";
import { CONTENT_LINKS } from "@/lib/content-links";
import { breadcrumbJsonLd, type Breadcrumb } from "@/lib/seo";
import { cn } from "@/lib/utils";

/**
 * The frame every content page shares: a header back to the map, the page, and
 * a footer that links the content pages to each other.
 *
 * The footer's links are what let a crawler that lands on one page find the
 * rest, and its disclaimer is what keeps a page that ranks for "moventis" from
 * reading as Moventis' own.
 */
/**
 * The header's sections. The map is one of them, and last: it is the app, and
 * these pages are the way back to it as much as the way in.
 */
const HEADER_LINKS = [
  { href: "/linies", label: "línies", icon: LayoutList },
  { href: "/parades", label: "parades", icon: MapPin },
  { href: "/", label: "mapa", icon: MapIcon },
] as const;

export const ContentPage = ({
  title,
  updated,
  leading,
  breadcrumbs,
  section,
  wide = false,
  children,
}: {
  title: string;
  /** Shown under the title, e.g. "revisat el 3 d'octubre del 2026". */
  updated?: string;
  /** Drawn before the title on the same row, e.g. a line's badge. */
  leading?: React.ReactNode;
  /**
   * The pages above this one, outermost first. Shown over the title and sent
   * as a `BreadcrumbList`, which is what Google prints instead of the bare URL.
   */
  breadcrumbs?: Breadcrumb[];
  /** The header section this page sits under, marked as the current page. */
  section?: "/linies" | "/parades";
  /**
   * A wider column for pages of cards rather than prose. Prose stays at
   * `max-w-2xl`, the measure `DESIGN.md` asks for.
   */
  wide?: boolean;
  children: React.ReactNode;
}) => {
  const column = wide ? "max-w-4xl" : "max-w-2xl";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border border-b">
        <div
          className={cn(
            "mx-auto flex w-full items-center justify-between gap-4 px-4 py-3",
            column,
          )}
        >
          <Link
            href="/"
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-sm text-sm font-semibold",
              FOCUS_RING,
            )}
          >
            <Image
              src="/android-chrome-192x192.png"
              width={192}
              height={192}
              alt=""
              className="size-6"
            />
            {/* Kept as the link's name on a phone, where the row has room
                for the three sections and not for the site name too. */}
            <span className="max-sm:sr-only">bus urbà lleida</span>
          </Link>
          <nav aria-label="seccions">
            <ul className="flex items-center gap-1">
              {HEADER_LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={section === href ? "page" : undefined}
                    className={cn(
                      "hover:bg-muted flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors sm:px-3",
                      section === href
                        ? "bg-muted font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                      FOCUS_RING,
                    )}
                  >
                    <Icon
                      size={16}
                      aria-hidden
                      className="shrink-0 max-sm:hidden"
                    />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className={cn("mx-auto w-full flex-1 px-4 py-10 md:py-16", column)}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <>
            <JsonLd data={breadcrumbJsonLd(breadcrumbs, title)} />
            <nav aria-label="ruta de navegació" className="mb-3">
              <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb) => (
                  <li key={crumb.href} className="flex items-center gap-1.5">
                    <Link
                      href={crumb.href}
                      className={cn(
                        "hover:text-foreground rounded-sm underline-offset-4 hover:underline",
                        FOCUS_RING,
                      )}
                    >
                      {crumb.label}
                    </Link>
                    <span aria-hidden="true">/</span>
                  </li>
                ))}
              </ol>
            </nav>
          </>
        )}
        <div className="flex items-center gap-3">
          {leading}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {updated && (
          <p className="text-muted-foreground mt-1 text-xs">{updated}</p>
        )}
        {children}
      </main>

      <footer className="border-border border-t">
        <div
          className={cn(
            "text-muted-foreground mx-auto w-full space-y-3 px-4 py-8 text-sm leading-relaxed",
            column,
          )}
        >
          <nav aria-label="pàgines d'informació">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              <li>
                <Link
                  href="/"
                  className={cn(
                    "hover:text-foreground rounded-sm underline-offset-4 hover:underline",
                    FOCUS_RING,
                  )}
                >
                  mapa en directe
                </Link>
              </li>
              {CONTENT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "hover:text-foreground rounded-sm underline-offset-4 hover:underline",
                      FOCUS_RING,
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p>
            web no oficial, sense relació amb moventis, autobusos de lleida ni
            la paeria. les línies, les parades i els horaris surten de les dades
            públiques de moventis.es.
          </p>
          <AuthorCredit />
        </div>
      </footer>
    </div>
  );
};
