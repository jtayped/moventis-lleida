import React from "react";
import { FOCUS_RING } from "@/components/content/styles";
import { Link } from "@/i18n/link";
import { cn } from "@/lib/utils";

/**
 * Text building blocks for the content pages. They used to live inside
 * `/privadesa` as local helpers; every content page now shares them so the
 * pages read as one site.
 *
 * Body copy is 14px and capped by the page's `max-w-2xl`, which keeps lines
 * under the 65 characters `DESIGN.md` asks for.
 */
export const Section = ({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) => (
  <section id={id} className="mt-8 scroll-mt-6 space-y-3">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </section>
);

export const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
);

export const List = ({ children }: { children: React.ReactNode }) => (
  <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm leading-relaxed">
    {children}
  </ul>
);

/**
 * A link that leaves the site. Shows the URL itself unless given a label,
 * which is what `/privadesa` wants for policy links people may copy.
 */
export const External = ({
  href,
  children,
}: {
  href: string;
  children?: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-foreground underline underline-offset-4"
  >
    {children ?? <span className="break-all">{href}</span>}
  </a>
);

/** A link to another page of this site, given its Catalan path. */
export const InternalLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className={cn(
      "text-foreground rounded-sm underline underline-offset-4",
      FOCUS_RING,
    )}
  >
    {children}
  </Link>
);
