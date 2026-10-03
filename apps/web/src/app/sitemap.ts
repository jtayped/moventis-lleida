import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/metadata";
import { stopPath } from "@/lib/stops";
import { api } from "@/trpc/server";

// Lines come from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/linies`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/parades`, changeFrequency: "daily", priority: 0.8 },
  {
    url: `${SITE_URL}/informacio`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { url: `${SITE_URL}/tarifes`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${SITE_URL}/privadesa`, changeFrequency: "yearly", priority: 0.2 },
];

/**
 * Every page Google should index: the fixed pages, then one per live line and
 * one per live stop.
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
    return [
      ...STATIC_PAGES,
      ...lines.map((line) => ({
        url: `${SITE_URL}/linies/${line.code}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...stops.map((stop) => ({
        url: `${SITE_URL}${stopPath(stop)}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch (err) {
    console.error("sitemap: could not list lines and stops", err);
    return STATIC_PAGES;
  }
}
