import type { Lang } from "@moventis/shared";

const ca = {
  index: {
    title: "línies i horaris del bus urbà de lleida",
    description:
      "totes les línies del bus urbà de lleida, amb el primer i l'últim bus, cada quant passen i l'horari complet de cada recorregut.",
    intro: (count: number) =>
      `${count} línies. tria'n una per veure'n l'horari i les parades.`,
    lineSr: (code: string) => `línia ${code}: `,
    headway: (minutes: number) => `cada ${minutes} min els feiners`,
    noteTitle: "d'on surten aquestes hores",
    note: (dates: string) =>
      `són les hores de sortida de l'inici del recorregut, de l'horari programat de moventis per a un dia concret de cada tipus: ${dates}. la freqüència és el temps més habitual entre dos busos del recorregut que en té més.`,
  },

  page: {
    /** "bus 20 lleida" is how people search for a line, not "línia 20". */
    metaTitle: (code: string, name: string) =>
      `bus ${code} lleida (${name}): horaris, recorregut i parades`,
    /** `when` is `metaWhen`'s sentence, or "" when the line has no weekday service. */
    metaDescription: (code: string, name: string, when: string) =>
      `horaris de la línia ${code} (${name}) del bus urbà de lleida.${when} horari complet per dies i totes les parades del recorregut.`,
    metaWhen: (first: string, last: string, headway: number | null) =>
      ` els dies feiners surt de ${first} a ${last}${headway ? `, cada ${headway} min` : ""}.`,
    title: (code: string, name: string) => `línia ${code}: ${name}`,
    breadcrumb: "línies",
    intro: (code: string) =>
      `horaris i parades de la línia ${code} del bus urbà de lleida.`,
    untilSr: " fins a les ",
    headway: (minutes: number) => `cada ${minutes} min`,
    notRunning: "no circula",
    routeLabel: (code: string) => `recorregut de la línia ${code} sobre lleida`,
    openMap: "on són ara els busos? obre-la al mapa en directe",
    timetables: "horaris",
    noTimetable:
      "ara mateix no tenim l'horari d'aquesta línia. al mapa en directe pots veure quan passa per cada parada.",
    noteTitle: "d'on surten aquestes hores",
    noteDates: (dates: string) =>
      `de l'horari programat de moventis, per a un dia concret de cada tipus: ${dates}. són les sortides de la primera parada; a la resta, el bus hi passa més tard.`,
    noteHolidays:
      "els festius i els canvis de temporada poden tenir un horari diferent. per saber quan arriba de debò, mira el mapa en directe.",
  },

  faq: {
    heading: "preguntes freqüents",
    bus: (code: string) => `el bus ${code}`,
    atTime: (time: string) => `a les ${time}`,
    every: (minutes: number) => `cada ${minutes} min`,
    /** One day type's clause: "els diumenges no circula". */
    idle: (phrase: string) => `${phrase} no circula`,
    /** One day type's clause: "els dies feiners a les 07:00". */
    onDay: (phrase: string, fact: string) => `${phrase} ${fact}`,
    firstQ: (code: string) => `a quina hora passa el primer bus ${code}?`,
    lastQ: (code: string) => `a quina hora passa l'últim bus ${code}?`,
    headwayQ: (bus: string) => `cada quant passa ${bus}?`,
    sundayQ: (bus: string) => `${bus} circula els diumenges i festius?`,
    sundayYes: (first: string, last: string) => `sí, de ${first} a ${last}.`,
    sundayNo: "no, els diumenges i festius no circula.",
    stopsQ: (bus: string) => `per quines parades passa ${bus}?`,
    stopsBetween: (count: number, from: string, to: string) =>
      `per ${count} parades, de ${from} a ${to}.`,
    stopsLoop: (count: number, from: string) =>
      `per ${count} parades, en un recorregut circular des de ${from}.`,
    stopsOnly: (count: number) => `per ${count} parades.`,
  },

  timetable: {
    loopFrom: (stop: string) => `circular des de ${stop}`,
    until: " fins a ",
    spokenFromTo: (first: string, last: string) => `de ${first} a ${last}`,
    announce: (label: string, route: string, departures: number) =>
      `${label}, ${route}: ${departures} sortides`,
    noRunLineSr: (phrase: string) => `aquesta línia no circula ${phrase}`,
    day: "dia",
    route: "recorregut",
    routeCount: (count: number, phrase: string) => `(${count} ${phrase})`,
    noRunLine: (phrase: string) => `aquesta línia no circula ${phrase}.`,
    noRunRoute: (phrase: string) => `aquest recorregut no circula ${phrase}.`,
    stopCount: (count: number) => `${count} parades`,
    departuresFrom: " · sortides de ",
    firstStop: "la primera parada",
    showStops: (count: number) => `veure les ${count} parades`,
  },
};

export type LinesCopy = typeof ca;

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: LinesCopy = ca;

export const linesCopy: Record<Lang, LinesCopy> = { ca, es };
