import type { Lang } from "@moventis/shared";

const ca = {
  srTitle: "parada",
  srDescription: (name?: string) =>
    name ? `hores d'arribada per la parada ${name}` : "hores d'arribada",
  retry: "torna-ho a provar",
  stale: (ago: string, justNow: boolean) =>
    `no s'ha pogut actualitzar. ${
      !ago
        ? "les hores poden estar desfasades"
        : justNow
          ? "les hores són d'ara mateix"
          : `les hores són de ${ago}`
    }.`,
  /** "4", "4 i 7", "4, 7 i 9" — a list a person would read aloud. */
  joinLines: (codes: string[]) =>
    codes.length <= 1
      ? (codes[0] ?? "")
      : `${codes.slice(0, -1).join(", ")} i ${codes[codes.length - 1]}`,
  partial: (failed: string[], joined: string) =>
    `no s'han pogut carregar les hores de ${
      failed.length === 1 ? "la línia" : "les línies"
    } ${joined}`,
  deleted:
    "aquesta parada ja no es troba en servei. pot ser temporal per obres o canvis de ruta.",
  deletedSaved:
    " la tens a preferides, i per això segueix al mapa — treu-la amb l'estrella de dalt.",
  newStop: "aquesta parada s'ha afegit a la xarxa fa poc.",
  allPassed: "totes les hores han passat — actualitza.",
  refresh: "actualitza",
  noSchedules: "no hi ha horaris disponibles per a aquesta parada.",
  selectedLines: "línies seleccionades",
  transfers: "correspondències",
  fullTimetable: "horari complet de la parada",
  header: {
    directions: "com arribar-hi",
    lines: "línies d'aquesta parada i pròxim bus",
    line: (code: string) => `línia ${code}`,
    refresh: "actualitza les hores",
    close: "tanca",
  },
  lastUpdated: "actualitzat",
  error: {
    title: "hi ha hagut un problema carregant els busos :(",
    retry: "torna a intentar-ho",
  },
  preferida: {
    disabled:
      "Preferides desactivades: has rebutjat desar dades en aquest dispositiu",
    remove: "Treu de preferides",
    add: "Afegeix a preferides",
  },
  lineSchedule: {
    incident: "incidència de servei en aquesta línia",
    noBuses: "sense busos",
  },
  legend: {
    live: "hora estimada amb el bus ja en ruta",
    timetable: "hora prevista a l'horari oficial",
  },
  timeSource: {
    liveTitle:
      "hora en temps real: moventis segueix aquest bus i n'estima l'arribada. no en rebem la posició, només l'hora.",
    live: "en directe",
    timetableTitle:
      "hora de l'horari oficial: ara mateix no hi ha cap estimació en temps real per a aquest bus.",
    timetable: "horari",
  },
  arrival: {
    accessible: "Vehicle accessible",
    driftLabel: (
      magnitude: number,
      later: boolean,
      baseline: string | null,
      realTimeBaseline: boolean,
    ) =>
      `${magnitude} ${magnitude === 1 ? "minut" : "minuts"} ${
        later ? "més tard" : "abans"
      } del previst (${baseline})${realTimeBaseline ? "" : " segons l'horari"}`,
    driftChip: (magnitude: number, later: boolean, isNext: boolean) =>
      `${later ? "▲ +" : "▼ −"}${magnitude} min${isNext ? (later ? " tard" : " aviat") : ""}`,
  },
  navigation: {
    lines: (codes: string[]) =>
      codes.length === 1 ? `línia ${codes[0]}` : `línies ${codes.join(", ")}`,
    neighbour: (lines: string, isPrev: boolean, name: string) =>
      `${lines}, parada ${isPrev ? "anterior" : "següent"}: ${name}`,
  },
  liveBus: {
    loading: "situant els autobusos al mapa…",
    skipped: "no situem els autobusos d'aquesta parada al mapa.",
    skippedHint: (maxLines: number) =>
      `només ho fem per a les ${maxLines} últimes línies que has marcat — desmarca'n alguna per incloure aquesta.`,
    error: "no podem situar els autobusos al mapa ara mateix.",
    errorHint: "les hores d'arribada d'aquí sota segueixen funcionant.",
    none: "cap bus d'aquesta línia té una hora en temps real ara mateix.",
    noneHint: "per això no en podem situar cap al mapa.",
    count: (n: number) =>
      n === 1 ? "1 autobús situat al mapa" : `${n} autobusos situats al mapa`,
    deduced:
      "deduïm el tram de les hores d'arribada; moventis no en publica la posició.",
    approximate: (n: number) =>
      n === 1 ? "1 amb el tram aproximat" : `${n} amb el tram aproximat`,
  },
};

export type StopDetailsCopy = typeof ca;

const es: StopDetailsCopy = {
  srTitle: "parada",
  srDescription: (name?: string) =>
    name ? `horas de llegada de la parada ${name}` : "horas de llegada",
  retry: "reintentar",
  stale: (ago: string, justNow: boolean) =>
    `no se ha podido actualizar. ${
      !ago
        ? "las horas pueden estar desfasadas"
        : justNow
          ? "las horas son de ahora mismo"
          : `las horas son de ${ago}`
    }.`,
  joinLines: (codes: string[]) =>
    codes.length <= 1
      ? (codes[0] ?? "")
      : `${codes.slice(0, -1).join(", ")} y ${codes[codes.length - 1]}`,
  partial: (failed: string[], joined: string) =>
    `no se han podido cargar las horas de ${
      failed.length === 1 ? "la línea" : "las líneas"
    } ${joined}`,
  deleted:
    "esta parada ya no está en servicio. puede ser temporal, por obras o cambios de ruta.",
  deletedSaved:
    " la tienes en favoritas, por eso sigue en el mapa. quítala con la estrella de arriba.",
  newStop: "esta parada se ha añadido a la red hace poco.",
  allPassed: "ya han pasado todas las horas: actualiza.",
  refresh: "actualizar",
  noSchedules: "no hay horarios disponibles para esta parada.",
  selectedLines: "líneas seleccionadas",
  transfers: "correspondencias",
  fullTimetable: "horario completo de la parada",
  header: {
    directions: "cómo llegar",
    lines: "líneas de esta parada y próximo bus",
    line: (code: string) => `línea ${code}`,
    refresh: "actualizar las horas",
    close: "cerrar",
  },
  lastUpdated: "actualizado",
  error: {
    title: "ha habido un problema al cargar los buses :(",
    retry: "reintentar",
  },
  preferida: {
    disabled:
      "favoritas desactivadas: has rechazado guardar datos en este dispositivo",
    remove: "quitar de favoritas",
    add: "añadir a favoritas",
  },
  lineSchedule: {
    incident: "incidencia de servicio en esta línea",
    noBuses: "sin buses",
  },
  legend: {
    live: "hora estimada con el bus ya en ruta",
    timetable: "hora prevista en el horario oficial",
  },
  timeSource: {
    liveTitle:
      "hora en tiempo real: moventis sigue este bus y estima su llegada. no recibimos su posición, solo la hora.",
    live: "en directo",
    timetableTitle:
      "hora del horario oficial: ahora mismo no hay ninguna estimación en tiempo real para este bus.",
    timetable: "horario",
  },
  arrival: {
    accessible: "vehículo accesible",
    driftLabel: (
      magnitude: number,
      later: boolean,
      baseline: string | null,
      realTimeBaseline: boolean,
    ) =>
      `${magnitude} ${magnitude === 1 ? "minuto" : "minutos"} ${
        later ? "más tarde" : "antes"
      } de lo previsto (${baseline})${realTimeBaseline ? "" : " según el horario"}`,
    driftChip: (magnitude: number, later: boolean, isNext: boolean) =>
      `${later ? "▲ +" : "▼ −"}${magnitude} min${isNext ? (later ? " tarde" : " pronto") : ""}`,
  },
  navigation: {
    lines: (codes: string[]) =>
      codes.length === 1 ? `línea ${codes[0]}` : `líneas ${codes.join(", ")}`,
    neighbour: (lines: string, isPrev: boolean, name: string) =>
      `${lines}, parada ${isPrev ? "anterior" : "siguiente"}: ${name}`,
  },
  liveBus: {
    loading: "situando los autobuses en el mapa…",
    skipped: "no situamos en el mapa los autobuses de esta parada.",
    skippedHint: (maxLines: number) =>
      `solo lo hacemos para las ${maxLines} últimas líneas que has marcado. desmarca alguna para incluir esta.`,
    error: "ahora mismo no podemos situar los autobuses en el mapa.",
    errorHint: "las horas de llegada de aquí abajo siguen funcionando.",
    none: "ningún bus de esta línea tiene una hora en tiempo real ahora mismo.",
    noneHint: "por eso no podemos situar ninguno en el mapa.",
    count: (n: number) =>
      n === 1
        ? "1 autobús situado en el mapa"
        : `${n} autobuses situados en el mapa`,
    deduced:
      "deducimos el tramo a partir de las horas de llegada; moventis no publica su posición.",
    approximate: (n: number) =>
      n === 1 ? "1 con el tramo aproximado" : `${n} con el tramo aproximado`,
  },
};

export const stopDetailsCopy: Record<Lang, StopDetailsCopy> = { ca, es };
