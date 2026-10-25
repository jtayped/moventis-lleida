import type { Lang } from "@moventis/shared";

const ca = {
  time: {
    nowCompact: "ara",
    arriving: "arribant",
    countdownNow: "Ara",
    agoNow: "ara",
    agoSeconds: (s: number) => `fa ${s}s`,
    agoMinutes: (m: number) => `fa ${m}m`,
  },
  nav: {
    label: "navegació principal",
    pages: {
      linies: { label: "línies", title: "línies i horaris" },
      parades: { label: "parades", title: "totes les parades" },
    },
    info: {
      tarifes: { label: "tarifes", title: "tarifes i títols de transport" },
      informacio: { label: "informació", title: "sobre aquest web" },
    },
    panels: {
      search: { label: "cerca", title: "busca una parada" },
      settings: { label: "configuració", title: "configuració" },
    },
  },
  shell: {
    kofiLabel: "fes una donació al projecte a ko-fi",
    kofiTitle: "fes una donació a ko-fi",
    locateError: "no s'ha pogut obtenir la ubicació",
    locateUnsupported: "el navegador no suporta la geolocalització",
    locate: "la meva ubicació",
    arrivalTimes: "hores d'arribada",
    directions: "com arribar-hi",
    userLocation: "La teva ubicació",
  },
  panel: {
    close: "tanca",
  },
  ui: {
    sheetClose: "tanca",
    dialogClose: "Close",
    loading: "Loading",
    mapLoadFailed:
      "no s'ha pogut carregar el mapa. comprova la connexió i torna-ho a provar.",
    reload: "recarrega",
  },
  busMarker: {
    line: (code: string) => `Bus línia ${code}`,
    consecutive: "entre dues parades consecutives",
    span: (n: number) => `entre parades (${n} trams)`,
    estimated: "posició estimada",
    imprecise: "posició poc precisa",
  },
  stopsError: {
    message: "no s'han pogut carregar les parades",
    retry: "torna-ho a provar",
  },
  search: {
    placeholder: "busca la teva parada",
    loading: "carregant",
    error: "error",
    count: (n: number) => `${n} parades`,
    none: "cap parada",
  },
  routes: {
    hideSaved: "amaga les parades preferides",
    showSaved: "mostra les parades preferides",
    toggleLine: (selected: boolean, code: string, active: boolean) =>
      `${selected ? "amaga" : "mostra"} les parades de la línia ${code}${
        active ? "" : " (fora d'horari avui)"
      }`,
    offHours: "fora d'horari avui",
    list: "línies",
    selectHint: "Selecciona una línia per veure les parades al mapa",
  },
  searchPanel: {
    close: "tanca la cerca",
    title: "cerca",
    typeName: "escriu el nom d'una parada",
    loading: "carregant",
    noneOnLines: "cap parada d'aquestes línies amb aquest nom",
    none: "cap parada amb aquest nom",
    results: "resultats de la cerca",
    saved: "preferida",
    line: (code: string) => `línia ${code}`,
  },
  consent: {
    accept: "d'acord",
    acceptLabel: "accepta l'ús de l'emmagatzematge local per a les preferides",
    decline: "rebutja",
    declineLabel: "rebutja l'ús de l'emmagatzematge local per a les preferides",
    more: "més informació",
  },
  cookieBanner: {
    label: "preferències de privadesa",
    text: "Aquest lloc guarda al teu navegador les parades que marquis com a preferides, només en aquest dispositiu. No fem servir cookies de seguiment. Comptem visites de forma anònima amb una eina pròpia, i pots desactivar-ho a la configuració.",
  },
  errorPage: {
    title: "alguna cosa ha fallat",
    text: "no hem pogut mostrar aquesta pàgina. si estàs a la parada, torna-ho a provar — sol ser cosa de la connexió.",
    retry: "torna-ho a provar",
    backToMap: "torna al mapa",
  },
  notFound: {
    title: "aquesta pàgina no existeix",
    text: "potser l'enllaç ha canviat.",
    backToMap: "torna al mapa",
    lines: "línies",
    stops: "parades",
  },
  loading: {
    logoAlt: "Logo",
    text: "carregant...",
  },
};

export type MapCopy = typeof ca;

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: MapCopy = ca;

export const mapCopy: Record<Lang, MapCopy> = { ca, es };
