/**
 * Public URLs per language, and how they map onto the app's routes.
 *
 * Catalan pages live at the root (`/linies/20`), Spanish ones under `/es` with
 * Spanish segment names (`/es/lineas/20`). Internally every page sits under a
 * `[lang]` segment with the Catalan names (`/ca/linies/20`, `/es/linies/20`),
 * so one route file serves both. The middleware turns a public path into the
 * internal one, and links turn a Catalan path into the public one for a
 * language; both read this file, so the two directions cannot drift.
 */

export const LANGS = ["ca", "es"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "ca";

export const isLang = (value: string): value is Lang =>
  (LANGS as readonly string[]).includes(value);

/** Catalan first segment → its Spanish twin. Segments not listed keep their name. */
const SPANISH_SEGMENTS: Record<string, string> = {
  linies: "lineas",
  parades: "paradas",
  tarifes: "tarifas",
  informacio: "informacion",
  privadesa: "privacidad",
};

const CATALAN_SEGMENTS: Record<string, string> = Object.fromEntries(
  Object.entries(SPANISH_SEGMENTS).map(([ca, es]) => [es, ca]),
);

/** `"/linies/20?x=1#y"` → `["/linies/20", "?x=1#y"]`. */
const splitSuffix = (path: string): [string, string] => {
  const at = path.search(/[?#]/);
  return at === -1 ? [path, ""] : [path.slice(0, at), path.slice(at)];
};

/** Swaps the first segment of `pathname` through `map`, if it is in it. */
const swapFirstSegment = (pathname: string, map: Record<string, string>) => {
  const [, first = "", ...rest] = pathname.split("/");
  return Object.hasOwn(map, first)
    ? ["", map[first], ...rest].join("/")
    : pathname;
};

/**
 * The public URL of a page in `lang`, from its Catalan path:
 * `localePath("es", "/linies/20")` → `"/es/lineas/20"`. Query and hash pass
 * through untouched; `"/"` is the language's map.
 */
export const localePath = (lang: Lang, path: string): string => {
  if (lang === DEFAULT_LANG) return path;
  const [pathname, suffix] = splitSuffix(path);
  const translated = swapFirstSegment(pathname, SPANISH_SEGMENTS);
  return `/${lang}${translated === "/" ? "" : translated}${suffix}`;
};

export type PublicPathRoute =
  { rewrite: string; lang: Lang } | { redirect: string };

/**
 * What the middleware does with a public pathname (no query): rewrite it onto
 * the internal `[lang]` route, or redirect it to the one URL it should have.
 *
 * - `/ca/...` is the internal shape of a Catalan page, never its URL: it
 *   redirects to the unprefixed path, so each page has one address.
 * - `/es/linies/20` names a Spanish page with the Catalan segment: it
 *   redirects to `/es/lineas/20`.
 * - A language not in `published` is treated as a Catalan path, which the
 *   catch-all route answers with a 404.
 */
export const routePublicPath = (
  pathname: string,
  published: readonly Lang[],
): PublicPathRoute => {
  const [, first = "", ...rest] = pathname.split("/");
  const tail = rest.length > 0 ? `/${rest.join("/")}` : "";

  if (first === DEFAULT_LANG) return { redirect: tail || "/" };

  if (isLang(first) && published.includes(first)) {
    const [, segment = ""] = tail.split("/");
    if (Object.hasOwn(SPANISH_SEGMENTS, segment)) {
      return { redirect: localePath(first, tail) };
    }
    return {
      rewrite: `/${first}${swapFirstSegment(tail, CATALAN_SEGMENTS)}`,
      lang: first,
    };
  }

  return {
    rewrite: `/${DEFAULT_LANG}${pathname === "/" ? "" : pathname}`,
    lang: DEFAULT_LANG,
  };
};

/**
 * The Catalan path of the page a public pathname shows, the inverse of
 * `localePath`: `"/es/lineas/20"` → `"/linies/20"`. What a language switch
 * needs to find the same page in the other language.
 */
export const catalanPathOf = (
  pathname: string,
  published: readonly Lang[],
): string => {
  const route = routePublicPath(pathname, published);
  if ("redirect" in route) return catalanPathOf(route.redirect, published);
  return route.rewrite.slice(route.lang.length + 1) || "/";
};
