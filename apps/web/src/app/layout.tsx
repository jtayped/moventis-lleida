import { ROOT_METADATA, ROOT_VIEWPORT } from "@/constants/metadata";
import "@/styles/globals.css";

import type { Viewport, Metadata } from "next";
import { Geist } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the script above may add `class="dark"` to this
    // element before React hydrates, which would otherwise flag as a mismatch
    // against the class-less server render. Scoped to this one element only.
    <html
      lang="ca"
      className={`${geist.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="lowercase">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
