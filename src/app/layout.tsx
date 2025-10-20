import { ROOT_METADATA } from "@/constants/metadata";
import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import RootProviders from "./providers";

export const metadata: Metadata = ROOT_METADATA;

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca" className={`${geist.variable}`}>
      <body>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
