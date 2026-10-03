import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    // `/api/` is tRPC and the health check: JSON, and every stop query behind
    // it costs a live Moventis request a crawler has no business spending.
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
