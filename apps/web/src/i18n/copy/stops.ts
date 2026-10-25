import type { Lang } from "@moventis/shared";

const ca = {
  index: {
    title: "parades del bus urbà de lleida",
    description:
      "totes les parades del bus urbà de lleida, de la a a la z, amb les línies que hi paren. entra a una parada per veure'n els horaris.",
    intro: "busca la teva parada per veure'n els horaris i les línies.",
  },

  finder: {
    label: "cerca una parada",
    placeholder: "p. ex. plaça espanya",
    matches: (n: number) => `${n} ${n === 1 ? "parada" : "parades"}`,
    total: (n: number) => `${n} parades`,
    byLetter: "parades per lletra",
    noMatch: "cap parada es diu així. prova amb una altra paraula del nom.",
  },

  page: {
    /** `joined` is the stop's line codes as one list: "1, 6 i 7". */
    title: (name: string, lineCount: number, joined: string) =>
      `parada ${name}${
        lineCount === 0
          ? ""
          : ` (${lineCount === 1 ? "línia" : "línies"} ${joined})`
      }: horaris i pròxim bus`,
    description: (name: string, lineCount: number, joined: string) =>
      `horaris del bus urbà de lleida a la parada ${name}${
        lineCount === 0
          ? ""
          : `, on para ${lineCount === 1 ? "la línia" : "les línies"} ${joined}`
      }. pròxims busos, parades properes i temps real al mapa.`,
    intro: "parada del bus urbà de lleida.",
    servingLines: "línies que hi paren",
    line: (code: string) => `línia ${code}`,
    realtime: "quan arriba de debò? temps real al mapa",
    timetables: "horaris",
    noTimetable:
      "ara mateix no tenim l'horari d'aquesta parada. al mapa en directe pots veure quan hi passa cada bus.",
    nearby: "parades a prop",
    away: (distance: string) => `a ${distance}`,
    breadcrumb: "parades",
    noteTitle: "d'on surten aquestes hores",
    noteDates: (dates: string) =>
      `de l'horari programat de moventis, per a un dia concret de cada tipus: ${dates}. el pròxim bus es marca segons l'hora del teu dispositiu.`,
    noteHolidays:
      "els festius i els canvis de temporada poden tenir un horari diferent. per saber quan arriba de debò, mira el temps real al mapa.",
  },

  timetable: {
    day: "dia",
    announce: (label: string, running: number) =>
      `${label}: ${running} ${running === 1 ? "línia i direcció" : "línies i direccions"}`,
    noBus: (phrase: string) => `cap bus para aquí ${phrase}`,
    noBusSentence: (phrase: string) => `cap bus para aquí ${phrase}.`,
    lineSr: (code: string) => `línia ${code}: `,
    loop: "fa la volta i torna aquí",
    towards: (name: string | null) => `cap a ${name ?? "final de línia"}`,
  },
};

export type StopsCopy = typeof ca;

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: StopsCopy = ca;

export const stopsCopy: Record<Lang, StopsCopy> = { ca, es };
