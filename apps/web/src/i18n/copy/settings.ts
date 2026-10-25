import type { Lang } from "@moventis/shared";

const ca = {
  title: "configuració",
  description: "Aquestes preferències es guarden només en aquest dispositiu.",
  themes: { light: "clar", dark: "fosc", system: "sistema" },
  experimental: {
    title: "funcions experimentals",
    busPosition: "posició estimada del bus",
    badge: "experimental",
    busPositionHelp: (maxLines: number) =>
      `dedueix entre quines dues parades és cada bus a partir de les hores d'arribada que publica moventis, que no en dona ni la posició ni el gps. encara s'està ajustant i pot fallar. només per a les ${maxLines} últimes línies que marquis.`,
  },
  schedules: {
    title: "horaris",
    stopEtas: "pròxim bus al mapa",
    stopEtasHelp:
      "en apropar el mapa, mostra al costat de cada parada quant falta per al pròxim bus. consulta els horaris de les parades que veus, així que gasta dades.",
    drift: "avanç i retard dels busos",
    driftHelp:
      "mostra quants minuts s'ha avançat o endarrerit cada bus respecte a la primera hora que t'hem mostrat. verd vol dir abans, vermell després.",
  },
  appearance: {
    title: "aparença",
    theme: "tema",
  },
  privacy: {
    title: "privadesa i dades",
    storage: "emmagatzematge local:",
    enabled: "activat",
    disabled: "desactivat",
    storageHelp:
      "les parades preferides es guarden al navegador, només en aquest dispositiu. no fem servir cookies de seguiment. comptem visites de forma anònima amb una eina pròpia, i pots desactivar-ho a la configuració.",
    analytics: "analítica anònima",
    analyticsHelp:
      "Comptem visites i accions amb una eina pròpia (umami), sense cookies ni identificadors. serveix per saber quines línies i parades es consulten més.",
    clearSaved: "esborra les parades preferides",
    savedCount: (n: number) =>
      n === 1 ? "1 parada desada" : `${n} parades desades`,
    clear: "esborra",
  },
  more: {
    title: "més informació",
    pagesLabel: "pàgines d'informació",
  },
};

export type SettingsCopy = typeof ca;

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: SettingsCopy = ca;

export const settingsCopy: Record<Lang, SettingsCopy> = { ca, es };
