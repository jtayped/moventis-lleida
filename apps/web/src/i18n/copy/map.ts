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

const es: MapCopy = {
  time: {
    nowCompact: "ahora",
    arriving: "llegando",
    countdownNow: "ahora",
    agoNow: "ahora",
    agoSeconds: (s: number) => `hace ${s}s`,
    agoMinutes: (m: number) => `hace ${m}m`,
  },
  nav: {
    label: "navegación principal",
    pages: {
      linies: { label: "líneas", title: "líneas y horarios" },
      parades: { label: "paradas", title: "todas las paradas" },
    },
    info: {
      tarifes: { label: "tarifas", title: "tarifas y títulos de transporte" },
      informacio: { label: "información", title: "sobre esta web" },
    },
    panels: {
      search: { label: "buscar", title: "busca una parada" },
      settings: { label: "ajustes", title: "ajustes" },
    },
  },
  shell: {
    kofiLabel: "haz un donativo al proyecto en ko-fi",
    kofiTitle: "haz un donativo en ko-fi",
    locateError: "no se ha podido obtener la ubicación",
    locateUnsupported: "el navegador no admite la geolocalización",
    locate: "mi ubicación",
    arrivalTimes: "horas de llegada",
    directions: "cómo llegar",
    userLocation: "tu ubicación",
  },
  panel: {
    close: "cerrar",
  },
  ui: {
    sheetClose: "cerrar",
    dialogClose: "cerrar",
    loading: "cargando",
    mapLoadFailed:
      "no se ha podido cargar el mapa. comprueba la conexión y vuelve a intentarlo.",
    reload: "recargar",
  },
  busMarker: {
    line: (code: string) => `bus línea ${code}`,
    consecutive: "entre dos paradas consecutivas",
    span: (n: number) => `entre paradas (${n} tramos)`,
    estimated: "posición estimada",
    imprecise: "posición poco precisa",
  },
  stopsError: {
    message: "no se han podido cargar las paradas",
    retry: "reintentar",
  },
  search: {
    placeholder: "busca tu parada",
    loading: "cargando",
    error: "error",
    count: (n: number) => `${n} paradas`,
    none: "ninguna parada",
  },
  routes: {
    hideSaved: "ocultar las paradas favoritas",
    showSaved: "mostrar las paradas favoritas",
    toggleLine: (selected: boolean, code: string, active: boolean) =>
      `${selected ? "ocultar" : "mostrar"} las paradas de la línea ${code}${
        active ? "" : " (fuera de horario hoy)"
      }`,
    offHours: "fuera de horario hoy",
    list: "líneas",
    selectHint: "selecciona una línea para ver sus paradas en el mapa",
  },
  searchPanel: {
    close: "cerrar la búsqueda",
    title: "buscar",
    typeName: "escribe el nombre de una parada",
    loading: "cargando",
    noneOnLines: "ninguna parada de estas líneas con este nombre",
    none: "ninguna parada con este nombre",
    results: "resultados de la búsqueda",
    saved: "favorita",
    line: (code: string) => `línea ${code}`,
  },
  consent: {
    accept: "de acuerdo",
    acceptLabel: "aceptar el uso del almacenamiento local para las favoritas",
    decline: "rechazar",
    declineLabel: "rechazar el uso del almacenamiento local para las favoritas",
    more: "más información",
  },
  cookieBanner: {
    label: "preferencias de privacidad",
    text: "este sitio guarda en tu navegador las paradas que marques como favoritas, solo en este dispositivo. no usamos cookies de seguimiento. contamos visitas de forma anónima con una herramienta propia, y puedes desactivarlo en los ajustes.",
  },
  errorPage: {
    title: "algo ha fallado",
    text: "no hemos podido mostrar esta página. si estás en la parada, vuelve a intentarlo: suele ser cosa de la conexión.",
    retry: "reintentar",
    backToMap: "volver al mapa",
  },
  notFound: {
    title: "esta página no existe",
    text: "puede que el enlace haya cambiado.",
    backToMap: "volver al mapa",
    lines: "líneas",
    stops: "paradas",
  },
  loading: {
    logoAlt: "logo",
    text: "cargando...",
  },
};

export const mapCopy: Record<Lang, MapCopy> = { ca, es };
