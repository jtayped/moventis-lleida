"use client";

import { localePath } from "@moventis/shared";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useLang } from "@/i18n/lang-context";

/**
 * `next/link` for a page of this site, written with its Catalan path
 * (`/linies/20`) and sent to the same page in the current language
 * (`/es/lineas/20`). Every internal link goes through this, so no component
 * has to know which language it renders in to link correctly.
 */
export const Link = ({
  href,
  ...props
}: Omit<ComponentProps<typeof NextLink>, "href"> & { href: string }) => {
  const lang = useLang();
  return <NextLink href={localePath(lang, href)} {...props} />;
};
