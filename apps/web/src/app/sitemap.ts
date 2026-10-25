import { localePath } from "@moventis/shared";
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/metadata";
import { languageAlternates } from "@/i18n/alternates";
import { PUBLISHED_LANGS } from "@/i18n/langs";
import { stopPath } from "@/lib/stops";
import { api } from "@/trpc/server";

// Lines come from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

type Page = Omit<MetadataRoute.Sitemap[number], "url"> & {
  /** The page's Catalan path. */
  path: string;
};

const STATIC_PAGES: Page[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/linies", changeFrequency: "daily", priority: 0.9 },
  { path: "/parades", changeFrequency: "daily", priority: 0.8 },
  { path: "/informacio", changeFrequency: "monthly", priority: 0.6 },
  { path: "/tarifes", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privadesa", changeFrequency: "yearly", priority: 0.2 },
];

const absolute = (path: string) => (path === "/" ? SITE_URL : SITE_URL + path);

/**
 * One entry per published language for each page, each naming all of the
 * page's languages, which is how Google pairs the translations.
 */
const entries = (pages: Page[]): MetadataRoute.Sitemap =>
  pages.flatMap(({ path, ...rest }) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(path)).map(([lang, url]) => [
        lang,
        absolute(url),
      ]),
    );
    return PUBLISHED_LANGS.map((lang) => ({
      ...rest,
      url: absolute(localePath(lang, path)),
      alternates: { languages },
    }));
  });

/**
 * Every page Google should index, in every published language: the fixed
 * pages, then one per live line and one per live stop.
 *
 * If the database is down it still lists the fixed pages. A failing sitemap
 * would hide every page from that crawl, not just the lines.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [{ lines }, stops] = await Promise.all([
      api.content.lines(),
      api.content.stops(),
    ]);
    return entries([
      ...STATIC_PAGES,
      ...lines.map((line): Page => ({
        path: `/linies/${line.code}`,
        changeFrequency: "daily",
        priority: 0.8,
      })),
      ...stops.map((stop): Page => ({
        path: stopPath(stop),
        changeFrequency: "weekly",
        priority: 0.6,
      })),
    ]);
  } catch (err) {
    console.error("sitemap: could not list lines and stops", err);
    return entries(STATIC_PAGES);
  }
}
