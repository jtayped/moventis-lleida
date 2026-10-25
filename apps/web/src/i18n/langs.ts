import { isLang, type Lang } from "@moventis/shared";
import { notFound } from "next/navigation";

/**
 * The languages the site serves. A language in `LANGS` but not here has no
 * public URLs: the middleware treats its prefix as an unknown Catalan path.
 */
export const PUBLISHED_LANGS: readonly Lang[] = ["ca", "es"];

/**
 * The `[lang]` route param as a `Lang`. The middleware only rewrites onto a
 * published language, but a path it skips (one with a dot, say `/x.png`) still
 * reaches `[lang]` with whatever its first segment is, and that is a 404.
 */
export const asLang = (value: string): Lang => {
  if (!isLang(value) || !PUBLISHED_LANGS.includes(value)) notFound();
  return value;
};

/**
 * For a page with nothing dynamic in it, so it is prerendered once per
 * language instead of rendered on every request.
 */
export const langStaticParams = () => PUBLISHED_LANGS.map((lang) => ({ lang }));

/** The params of any page under `[lang]` with no params of its own. */
export interface LangParams {
  params: Promise<{ lang: string }>;
}
