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

const es: StopsCopy = {
  index: {
    title: "paradas del bus urbano de lleida",
    description:
      "todas las paradas del bus urbano de lleida, de la a a la z, con las líneas que paran en cada una. entra en una parada para ver sus horarios. web no oficial.",
    intro: "busca tu parada para ver sus horarios y sus líneas.",
  },

  finder: {
    label: "busca una parada",
    placeholder: "p. ej. plaça espanya",
    matches: (n: number) => `${n} ${n === 1 ? "parada" : "paradas"}`,
    total: (n: number) => `${n} paradas`,
    byLetter: "paradas por letra",
    noMatch: "ninguna parada se llama así. prueba con otra palabra del nombre.",
  },

  page: {
    title: (name: string, lineCount: number, joined: string) =>
      `parada ${name}${
        lineCount === 0
          ? ""
          : ` (${lineCount === 1 ? "línea" : "líneas"} ${joined})`
      }: horarios y próximo bus`,
    description: (name: string, lineCount: number, joined: string) =>
      `horarios del bus urbano de lleida en la parada ${name}${
        lineCount === 0
          ? ""
          : lineCount === 1
            ? `, donde para la línea ${joined}`
            : `, donde paran las líneas ${joined}`
      }. próximos buses, paradas cercanas y tiempo real en el mapa. web no oficial.`,
    intro: "parada del bus urbano de lleida.",
    servingLines: "líneas que paran aquí",
    line: (code: string) => `línea ${code}`,
    realtime: "¿cuándo llega de verdad? tiempo real en el mapa",
    timetables: "horarios",
    noTimetable:
      "ahora mismo no tenemos el horario de esta parada. en el mapa en directo puedes ver cuándo pasa cada bus.",
    nearby: "paradas cercanas",
    away: (distance: string) => `a ${distance}`,
    breadcrumb: "paradas",
    noteTitle: "de dónde salen estas horas",
    noteDates: (dates: string) =>
      `del horario programado de moventis, para un día concreto de cada tipo: ${dates}. el próximo bus se marca según la hora de tu dispositivo.`,
    noteHolidays:
      "los festivos y los cambios de temporada pueden tener otro horario. para saber cuándo llega de verdad, mira el tiempo real en el mapa.",
  },

  timetable: {
    day: "día",
    announce: (label: string, running: number) =>
      `${label}: ${running} ${running === 1 ? "línea y dirección" : "líneas y direcciones"}`,
    noBus: (phrase: string) => `ningún bus para aquí ${phrase}`,
    noBusSentence: (phrase: string) => `ningún bus para aquí ${phrase}.`,
    lineSr: (code: string) => `línea ${code}: `,
    loop: "da la vuelta y vuelve aquí",
    towards: (name: string | null) => `hacia ${name ?? "final de línea"}`,
  },
};

export const stopsCopy: Record<Lang, StopsCopy> = { ca, es };
