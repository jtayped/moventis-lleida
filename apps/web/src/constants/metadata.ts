import type { Lang } from "@moventis/shared";
import type { Metadata, Viewport } from "next";
import { siteCopy } from "@/i18n/copy/site";
import { AUTHOR_NAME, PORTFOLIO_URL } from "@/lib/project-links";

export const SITE_URL = "https://moventis-lleida.joeltaylor.business";

/**
 * The metadata every page inherits. `pageMetadata` rebuilds the Open Graph and
 * Twitter titles from `titleSuffix` by hand, because those do not go through
 * `title.template`.
 */
export const rootMetadata = (lang: Lang): Metadata => {
  const t = siteCopy[lang];
  return {
    metadataBase: new URL(SITE_URL),

    title: {
      default: t.homeTitle,
      template: `%s${t.titleSuffix}`,
    },

    description: t.description,

    keywords: t.keywords,

    authors: [{ name: AUTHOR_NAME, url: PORTFOLIO_URL }],
    creator: AUTHOR_NAME,
    publisher: AUTHOR_NAME,

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    alternates: {
      canonical: "/",
    },

    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon-16x16.png",
      apple: "/apple-touch-icon.png",
    },

    manifest: "/manifest.json",

    appleWebApp: {
      capable: true,
      title: t.appleWebAppTitle,
      statusBarStyle: "default",
    },

    formatDetection: {
      telephone: false,
    },

    openGraph: {
      title: t.shareTitle,

      description: t.shareDescription,

      url: SITE_URL,

      siteName: t.siteName,

      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 675,
          alt: t.shareImageAlt,
        },
      ],

      locale: t.ogLocale,

      type: "website",
    },

    twitter: {
      card: "summary_large_image",

      title: t.shareTitle,

      description: t.shareDescription,
      creator: "@jtayped_",
      images: ["/og-image.png"],
    },
  };
};

export const ROOT_VIEWPORT: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#2563eb" }],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
