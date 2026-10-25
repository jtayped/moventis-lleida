import { localePath, type Lang } from "@moventis/shared";
import type { Metadata } from "next";
import { rootMetadata, SITE_URL } from "@/constants/metadata";
import { siteCopy } from "@/i18n/copy/site";

interface PageMetadataInput {
  /** The page's own title. The root template appends the site suffix. */
  title: string;
  description: string;
  /**
   * The page's Catalan path, e.g. `/tarifes`; `lang` turns it into the public
   * one. Resolved against `metadataBase`.
   */
  path: string;
  lang: Lang;
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
  lang,
}: PageMetadataInput): Metadata {
  const root = rootMetadata(lang);
  const fullTitle = `${title}${siteCopy[lang].titleSuffix}`;
  const url = localePath(lang, path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...root.openGraph,
      title: fullTitle,
      description,
      url,
    },
    twitter: {
      ...root.twitter,
      title: fullTitle,
      description,
    },
  };
}

export interface Breadcrumb {
  label: string;
  /** The ancestor's Catalan path, e.g. `/linies`. */
  href: string;
}

/**
 * A schema.org `BreadcrumbList` for `ancestors` followed by the current page.
 * The current page goes without a URL, which Google reads as "this page".
 */
export function breadcrumbJsonLd(
  lang: Lang,
  ancestors: Breadcrumb[],
  current: string,
) {
  const items = [
    ...ancestors.map((crumb) => ({
      name: crumb.label,
      item: `${SITE_URL}${localePath(lang, crumb.href)}`,
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
