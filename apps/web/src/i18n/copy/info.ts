import type { Lang } from "@moventis/shared";

const ca = {
  metaTitle: "informació del bus urbà de lleida",
  description:
    "com funciona el bus urbà de lleida (autobusos de lleida, grup moventis): a quina hora passa l'últim bus, si hi ha bus els diumenges i festius, el bus nocturn n1, temps real, contacte i objectes perduts.",
  title: "el bus urbà de lleida",
  /** Last time the facts on the page were checked against their sources. */
  reviewedOn: "3 d'octubre del 2026",
  updated: (date: string) => `revisat el ${date}`,

  lastBusTable: {
    line: "línia",
    lineSr: (code: string) => `línia ${code}`,
    notRunning: "no circula",
  },

  /**
   * The lines with no sunday departures as a clause: ", i la 9 i la 16 no
   * circulen". Empty when every line runs. `joined` is the codes as one list.
   */
  noSundayClause: (count: number, joined: string) =>
    count === 0
      ? ""
      : `, i ${joined} no ${count === 1 ? "circula" : "circulen"}`,
  /** One line in that list: "la 9". */
  lineRef: (code: string) => `la ${code}`,
};

export type InfoCopy = typeof ca;

const es: InfoCopy = {
  metaTitle: "información del bus urbano de lleida",
  description:
    "cómo funciona el bus urbano de lleida (autobusos de lleida, grupo moventis): a qué hora pasa el último bus, si hay buses los domingos y festivos, el bus nocturno n1, tiempo real, contacto y objetos perdidos.",
  title: "el bus urbano de lleida",
  reviewedOn: "3 de octubre de 2026",
  updated: (date: string) => `revisado el ${date}`,

  lastBusTable: {
    line: "línea",
    lineSr: (code: string) => `línea ${code}`,
    notRunning: "no circula",
  },

  noSundayClause: (count: number, joined: string) =>
    count === 0
      ? ""
      : `, y ${joined} no ${count === 1 ? "circula" : "circulan"}`,
  lineRef: (code: string) => `la ${code}`,
};

export const infoCopy: Record<Lang, InfoCopy> = { ca, es };
