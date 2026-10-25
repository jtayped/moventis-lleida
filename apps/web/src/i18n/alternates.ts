import { DEFAULT_LANG, localePath } from "@moventis/shared";
import { PUBLISHED_LANGS } from "@/i18n/langs";

/**
 * Every published language's URL for one page, plus `x-default`, from its
 * Catalan path: what hreflang wants. Paths stay relative so metadata resolves
 * them against `metadataBase`; the sitemap prefixes the origin itself.
 */
export const languageAlternates = (path: string): Record<string, string> => ({
  ...Object.fromEntries(
    PUBLISHED_LANGS.map((lang) => [lang, localePath(lang, path)]),
  ),
  "x-default": localePath(DEFAULT_LANG, path),
});
