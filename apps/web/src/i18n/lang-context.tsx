"use client";

import { DEFAULT_LANG, type Lang } from "@moventis/shared";
import { createContext, useContext } from "react";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** Set once by the root layout, from the `[lang]` segment. */
export const LangProvider = LangContext.Provider;

/** The language of the page being rendered. */
export const useLang = (): Lang => useContext(LangContext);
