import type { DayType } from "@moventis/api";
import type { Lang } from "@moventis/shared";

/** "a, b i c", the way a list is read aloud. */
const joinList = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;

const ca = {
  dayTypeLabels: {
    weekday: "feiners",
    saturday: "dissabtes",
    sunday: "diumenges",
  } satisfies Record<DayType, string>,
  /** The same, inside a sentence: "no circula els diumenges". */
  dayTypePhrases: {
    weekday: "els dies feiners",
    saturday: "els dissabtes",
    sunday: "els diumenges",
  } satisfies Record<DayType, string>,
  joinList,
  /** A formatted date inside a sentence: "el dilluns 5 d'octubre". */
  onDate: (date: string) => `el ${date}`,

  /** Told to screen readers on every link that opens a new tab. */
  newTab: " (s'obre en una pestanya nova)",

  header: {
    sections: "seccions",
    breadcrumbs: "ruta de navegació",
    lines: "línies",
    stops: "parades",
    map: "mapa",
  },
  footer: {
    pages: "pàgines del web",
    unofficial:
      "web no oficial, sense relació amb moventis, autobusos de lleida ni la paeria.",
    dataFrom: "dades públiques de",
  },

  siteLinks: {
    map: "mapa en directe",
    lines: "línies i horaris",
    stops: "parades",
    info: "informació",
    fares: "tarifes",
    privacy: "privadesa",
  },

  authorCard: {
    madeBy: "fet per",
    donate: "fes una donació",
    codeAt: "el codi a ",
  },

  /** The badges of a stop's lines as one phrase: ", línies 1, 6 i 7". */
  linesServing: (codes: string[]) =>
    `, ${codes.length === 1 ? "línia" : "línies"} ${joinList(codes)}`,

  serviceSpan: {
    notRunning: "no circula",
    fromTo: (first: string, last: string) => `de ${first} a ${last}`,
  },

  stopWithoutName: (externalId: string) => `parada ${externalId}`,

  periods: {
    morning: "matí",
    afternoon: "tarda",
    night: "nit",
  },
  next: "pròxim",
  noMoreToday: "avui ja no en passa cap més.",
  showGone: (n: number) =>
    n === 1 ? "veure l'1 que ja ha passat" : `veure els ${n} que ja han passat`,
};

export type ContentCopy = typeof ca;

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: ContentCopy = ca;

export const contentCopy: Record<Lang, ContentCopy> = { ca, es };
