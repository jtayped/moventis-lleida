"use client";

import { DEFAULT_LANG, type Lang } from "@moventis/shared";
import { createContext, useContext, type ReactNode } from "react";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/**
 * Set once by the root layout, from the `[lang]` segment. A component rather
 * than `LangContext.Provider` itself: the layout is a server component, and a
 * context object passed across the client boundary is not a renderable type.
 */
export const LangProvider = ({
  value,
  children,
}: {
  value: Lang;
  children: ReactNode;
}) => <LangContext.Provider value={value}>{children}</LangContext.Provider>;

/** The language of the page being rendered. */
export const useLang = (): Lang => useContext(LangContext);
