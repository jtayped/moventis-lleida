import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { CONTENT_LINKS } from "@/lib/content-links";

/**
 * The frame every content page shares: a header back to the map, the page, and
 * a footer that links the content pages to each other.
 *
 * The footer's links are what let a crawler that lands on one page find the
 * rest, and its disclaimer is what keeps a page that ranks for "moventis" from
 * reading as Moventis' own.
 */
export const ContentPage = ({
  title,
  updated,
  children,
}: {
  title: string;
  /** Shown under the title, e.g. "revisat el 3 d'octubre del 2026". */
  updated?: string;
  children: React.ReactNode;
}) => (
  <div className="flex min-h-screen flex-col">
    <header className="border-border border-b">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Image
            src="/android-chrome-192x192.png"
            width={192}
            height={192}
            alt=""
            className="size-6"
          />
          bus urbà lleida
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          torna al mapa
        </Link>
      </div>
    </header>

    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 md:py-16">
      <h1 className="text-2xl font-bold">{title}</h1>
      {updated && (
        <p className="text-muted-foreground mt-1 text-xs">{updated}</p>
      )}
      {children}
    </main>

    <footer className="border-border border-t">
      <div className="text-muted-foreground mx-auto w-full max-w-2xl space-y-3 px-4 py-8 text-xs leading-relaxed">
        <nav aria-label="pàgines d'informació">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            <li>
              <Link
                href="/"
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                mapa en directe
              </Link>
            </li>
            {CONTENT_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-foreground underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p>
          web no oficial, sense relació amb moventis, autobusos de lleida ni la
          paeria. les línies, les parades i els horaris surten de les dades
          públiques de moventis.es.
        </p>
      </div>
    </footer>
  </div>
);
