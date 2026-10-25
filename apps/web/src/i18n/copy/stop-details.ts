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

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: StopDetailsCopy = ca;

export const stopDetailsCopy: Record<Lang, StopDetailsCopy> = { ca, es };
