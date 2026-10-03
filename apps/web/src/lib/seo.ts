import type { Metadata } from "next";
import { ROOT_METADATA, TITLE_SUFFIX } from "@/constants/metadata";

interface PageMetadataInput {
  /** The page's own title. The root template appends the site suffix. */
  title: string;
  description: string;
  /** Absolute path, e.g. `/tarifes`. Resolved against `metadataBase`. */
  path: string;
}

/**
 * Metadata for any page other than the home page.
 *
 * Next merges `metadata` objects one level deep, so a page that sets nothing
 * inherits the root's `canonical: "/"` and its `og:url`, and tells Google it is
 * a copy of the home page. A page that sets only `openGraph.title` loses the
 * root's image, site name and locale instead, because the child object replaces
 * the parent's whole. This builds all three from the root so neither can happen.
 */
export function pageMetadata({
  title,
  description,
  path,
}: PageMetadataInput): Metadata {
  const fullTitle = `${title}${TITLE_SUFFIX}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...ROOT_METADATA.openGraph,
      title: fullTitle,
      description,
      url: path,
    },
    twitter: {
      ...ROOT_METADATA.twitter,
      title: fullTitle,
      description,
    },
  };
}
