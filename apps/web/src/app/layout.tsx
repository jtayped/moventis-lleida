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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca" className={`${geist.variable}`}>
      <body className="lowercase">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
