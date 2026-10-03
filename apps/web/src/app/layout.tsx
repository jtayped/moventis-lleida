import {
  ROOT_METADATA,
  ROOT_VIEWPORT,
  SITE_NAME,
  SITE_URL,
} from "@/constants/metadata";
import "@/styles/globals.css";

import type { Viewport, Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { JsonLd } from "@/components/seo/json-ld";
import {
  AUTHOR_NAME,
  GITHUB_PROFILE_URL,
  PORTFOLIO_URL,
} from "@/lib/project-links";
import { env } from "@/env";
import RootProviders from "./providers";

export const metadata: Metadata = ROOT_METADATA;
export const viewport: Viewport = ROOT_VIEWPORT;

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

/**
 * Applies `.dark` to `<html>` before first paint, from the same
 * `moventis:settings` key `use-settings.ts` owns (kept as a literal, not an
 * import: this runs as inline text in the client before any module does, so
 * it can't share the hook's constant — a mismatch here is a visible flash on
 * next load, not a silent one, so it stays easy to catch).
 *
 * Without this, the theme would only apply once `useSettings` mounts and
 * reads localStorage — a light flash on every load for anyone on dark or
 * system-dark, which is the exact thing this exists to prevent.
 */
const THEME_INIT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("moventis:settings")||"{}");var t=s&&s.theme;var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)document.documentElement.classList.add("dark");}catch(e){}})();`;

/**
 * The only host whose traffic belongs in the numbers. Umami's `data-domains`
 * makes the script ignore every other one, so a `pnpm dev` on localhost, a
 * preview deploy, or anyone running a fork with our website id inherited from
 * `.env.example` never lands in production's counts.
 */
const UMAMI_DOMAIN = "moventis-lleida.joeltaylor.business";

/**
 * Names the site for search engines. The publisher is a person on purpose: this
 * is not Moventis' site, and structured data claiming an organisation would say
 * otherwise in the one place Google reads as fact.
 */
const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "horaris bus lleida",
  url: SITE_URL,
  inLanguage: "ca",
  publisher: {
    "@type": "Person",
    name: AUTHOR_NAME,
    url: PORTFOLIO_URL,
    sameAs: [GITHUB_PROFILE_URL],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const umamiScriptUrl = env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  const umamiWebsiteId = env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return (
    // suppressHydrationWarning: the script above may add `class="dark"` to this
    // element before React hydrates, which would otherwise flag as a mismatch
    // against the class-less server render. Scoped to this one element only.
    <html lang="ca" className={`${geist.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <JsonLd data={WEBSITE_JSON_LD} />
      </head>
      <body className="lowercase">
        <RootProviders>{children}</RootProviders>
        {/* Both env vars or no tracker at all: they're optional (a fork, a
            preview, a build with no analytics host), and half a configuration
            would load a script that can't attribute anything it sends. The
            device's own opt-out is separate and lives in `useSettings` —
            the script honours it through the `umami.disabled` key, since the
            pageview it fires on load never passes through `lib/analytics.ts`. */}
        {umamiScriptUrl && umamiWebsiteId && (
          <Script
            defer
            strategy="afterInteractive"
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
            data-domains={UMAMI_DOMAIN}
          />
        )}
      </body>
    </html>
  );
}
