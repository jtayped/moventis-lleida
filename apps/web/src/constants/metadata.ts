import type { Metadata, Viewport } from "next";

export const SITE_URL = "https://moventis-lleida.joeltaylor.business";

export const SITE_NAME = "bus urbà lleida";

/**
 * What `title.template` appends to every page title. Exported because Open
 * Graph and Twitter titles do not go through the template, and `pageMetadata`
 * has to rebuild the same string for them by hand.
 */
export const TITLE_SUFFIX = " | bus lleida";

export const ROOT_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "bus urbà lleida | temps real",
    template: `%s${TITLE_SUFFIX}`,
  },

  description:
    "consulta els horaris de l'autobús urbà de lleida en temps real. una alternativa ràpida i neta a la web oficial de moventis.",

  keywords: [
    "bus lleida",
    "horaris bus",
    "moventis",
    "autobús lleida",
    "temps real",
    "parades lleida",
    "línies bus lleida",
  ],

  authors: [{ name: "Joel Taylor", url: "https://joeltaylor.business" }],
  creator: "Joel Taylor",
  publisher: "Joel Taylor",

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
    title: "horaris bus urbà lleida | temps real",
    statusBarStyle: "default",
  },

  formatDetection: {
    telephone: false,
  },

  openGraph: {
    title: "horaris bus urbà lleida",

    description:
      "consulta els horaris de l'autobús urbà de lleida en temps real.",

    url: SITE_URL,

    siteName: SITE_NAME,

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 675,
        alt: "imatge de l'aplicació d'horaris de bus de lleida",
      },
    ],

    locale: "ca_ES",

    type: "website",
  },

  twitter: {
    card: "summary_large_image",

    title: "horaris bus urbà lleida",

    description:
      "consulta els horaris de l'autobús urbà de lleida en temps real.",
    creator: "@jtayped_",
    images: ["/og-image.png"],
  },
};

export const ROOT_VIEWPORT: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#2563eb" }],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
