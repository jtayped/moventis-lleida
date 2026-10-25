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
  language: {
    title: "idioma",
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

const es: SettingsCopy = {
  title: "ajustes",
  description: "estas preferencias se guardan solo en este dispositivo.",
  themes: { light: "claro", dark: "oscuro", system: "sistema" },
  experimental: {
    title: "funciones experimentales",
    busPosition: "posición estimada del bus",
    badge: "experimental",
    busPositionHelp: (maxLines: number) =>
      `deduce entre qué dos paradas está cada bus a partir de las horas de llegada que publica moventis, que no da ni su posición ni el gps. aún se está ajustando y puede fallar. solo para las ${maxLines} últimas líneas que marques.`,
  },
  schedules: {
    title: "horarios",
    stopEtas: "próximo bus en el mapa",
    stopEtasHelp:
      "al acercar el mapa, muestra junto a cada parada cuánto falta para el próximo bus. consulta los horarios de las paradas que ves, así que gasta datos.",
    drift: "adelanto y retraso de los buses",
    driftHelp:
      "muestra cuántos minutos se ha adelantado o retrasado cada bus respecto a la primera hora que te hemos mostrado. verde quiere decir antes, rojo después.",
  },
  appearance: {
    title: "apariencia",
    theme: "tema",
  },
  language: {
    title: "idioma",
  },
  privacy: {
    title: "privacidad y datos",
    storage: "almacenamiento local:",
    enabled: "activado",
    disabled: "desactivado",
    storageHelp:
      "las paradas favoritas se guardan en el navegador, solo en este dispositivo. no usamos cookies de seguimiento. contamos visitas de forma anónima con una herramienta propia, y puedes desactivarlo en los ajustes.",
    analytics: "analítica anónima",
    analyticsHelp:
      "contamos visitas y acciones con una herramienta propia (umami), sin cookies ni identificadores. sirve para saber qué líneas y paradas se consultan más.",
    clearSaved: "borrar las paradas favoritas",
    savedCount: (n: number) =>
      n === 1 ? "1 parada guardada" : `${n} paradas guardadas`,
    clear: "borrar",
  },
  more: {
    title: "más información",
    pagesLabel: "páginas de información",
  },
};

export const settingsCopy: Record<Lang, SettingsCopy> = { ca, es };
