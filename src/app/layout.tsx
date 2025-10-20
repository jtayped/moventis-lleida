import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";

const siteUrl = "https://moventis-lleida.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "bus urbà lleida | temps real (no oficial)",
    template: "%s | bus lleida",
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

  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#2563eb" }],

  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },

  appleWebApp: {
    capable: true,
    title: "horaris bus urbá lleida | temps real",
    statusBarStyle: "default",
  },

  formatDetection: {
    telephone: false,
  },

  openGraph: {
    title: "horaris bus urbà lleida (no oficial)",

    description:
      "consulta els horaris de l'autobús urbà de lleida en temps real.",

    url: siteUrl,

    siteName: "bus urbà lleida",

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

    title: "horaris bus urbà lleida (no oficial)",

    description:
      "consulta els horaris de l'autobús urbà de lleida en temps real.",
    creator: "@jtayped_",
    images: ["/og-image.png"],
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
