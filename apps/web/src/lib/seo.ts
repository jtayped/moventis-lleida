import type { Metadata } from "next";
import { ROOT_METADATA, SITE_URL, TITLE_SUFFIX } from "@/constants/metadata";

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

export interface Breadcrumb {
  label: string;
  /** Absolute path, e.g. `/linies`. */
  href: string;
}

/**
 * A schema.org `BreadcrumbList` for `ancestors` followed by the current page.
 * The current page goes without a URL, which Google reads as "this page".
 */
export function breadcrumbJsonLd(ancestors: Breadcrumb[], current: string) {
  const items = [
    ...ancestors.map((crumb) => ({
      name: crumb.label,
      item: `${SITE_URL}${crumb.href}`,
    })),
    { name: current },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      ...item,
    })),
  };
}
