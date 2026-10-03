import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/metadata";

/**
 * Every page Google should index.
 *
 * Static for now: none of these pages reads the database. When the line and
 * stop pages land, this turns into a request-time route, because the build has
 * no database to list them from (see `ci.yml`'s note on the web build).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE_URL}/informacio`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    { url: `${SITE_URL}/tarifes`, changeFrequency: "monthly", priority: 0.6 },
    {
      url: `${SITE_URL}/privadesa`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
