"use client";

import { catalanPathOf, localePath, type Lang } from "@moventis/shared";
import { usePathname } from "next/navigation";
import { useLang } from "@/i18n/lang-context";
import { PUBLISHED_LANGS } from "@/i18n/langs";

/** Each language named in itself, as a reader of that language looks for it. */
const NAMES: Record<Lang, string> = { ca: "català", es: "castellano" };

/**
 * Links to the page being shown in each other published language. A plain
 * anchor, not a client navigation: the language is the root layout's segment,
 * so the whole document changes anyway. The query string is read at click
 * time because the map rewrites it with `replaceState` as the selection
 * changes, which no render sees.
 */
export const LangSwitch = ({ className }: { className?: string }) => {
  const lang = useLang();
  const catalanPath = catalanPathOf(usePathname(), PUBLISHED_LANGS);
  const others = PUBLISHED_LANGS.filter((other) => other !== lang);
  if (others.length === 0) return null;
  return others.map((other) => {
    const href = localePath(other, catalanPath);
    return (
      <a
        key={other}
        href={href}
        hrefLang={other}
        lang={other}
        className={className}
        onClick={(event) => {
          event.currentTarget.href = href + window.location.search;
        }}
      >
        {NAMES[other]}
      </a>
    );
  });
};
