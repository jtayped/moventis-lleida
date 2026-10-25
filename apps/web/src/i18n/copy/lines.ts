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

const es: LinesCopy = {
  index: {
    title: "líneas y horarios del bus urbano de lleida",
    description:
      "todas las líneas del bus urbano de lleida, con el primer y el último bus, cada cuánto pasan y el horario completo de cada recorrido. web no oficial.",
    intro: (count: number) =>
      `${count} líneas. elige una para ver su horario y sus paradas.`,
    lineSr: (code: string) => `línea ${code}: `,
    headway: (minutes: number) => `cada ${minutes} min los laborables`,
    noteTitle: "de dónde salen estas horas",
    note: (dates: string) =>
      `son las horas de salida del inicio del recorrido, del horario programado de moventis para un día concreto de cada tipo: ${dates}. la frecuencia es el tiempo más habitual entre dos buses del recorrido que más tiene.`,
  },

  page: {
    metaTitle: (code: string, name: string) =>
      `bus ${code} lleida (${name}): horarios, recorrido y paradas`,
    metaDescription: (code: string, name: string, when: string) =>
      `horarios de la línea ${code} (${name}) del bus urbano de lleida.${when} horario completo por días, todas las paradas del recorrido y el bus en tiempo real en el mapa. web no oficial.`,
    metaWhen: (first: string, last: string, headway: number | null) =>
      ` los días laborables circula de ${first} a ${last}${headway ? `, cada ${headway} min` : ""}.`,
    title: (code: string, name: string) => `línea ${code}: ${name}`,
    breadcrumb: "líneas",
    intro: (code: string) =>
      `horarios y paradas de la línea ${code} del bus urbano de lleida.`,
    untilSr: " hasta las ",
    headway: (minutes: number) => `cada ${minutes} min`,
    notRunning: "no circula",
    routeLabel: (code: string) => `recorrido de la línea ${code} por lleida`,
    openMap: "¿dónde están ahora los buses? ábrela en el mapa en directo",
    timetables: "horarios",
    noTimetable:
      "ahora mismo no tenemos el horario de esta línea. en el mapa en directo puedes ver cuándo pasa por cada parada.",
    noteTitle: "de dónde salen estas horas",
    noteDates: (dates: string) =>
      `del horario programado de moventis, para un día concreto de cada tipo: ${dates}. son las salidas de la primera parada; por las demás, el bus pasa más tarde.`,
    noteHolidays:
      "los festivos y los cambios de temporada pueden tener otro horario. para saber cuándo llega de verdad, mira el mapa en directo.",
  },

  faq: {
    heading: "preguntas frecuentes",
    bus: (code: string) => `el bus ${code}`,
    atTime: (time: string) => `a las ${time}`,
    every: (minutes: number) => `cada ${minutes} min`,
    idle: (phrase: string) => `${phrase} no circula`,
    onDay: (phrase: string, fact: string) => `${phrase} ${fact}`,
    firstQ: (code: string) => `¿a qué hora pasa el primer bus ${code}?`,
    lastQ: (code: string) => `¿a qué hora pasa el último bus ${code}?`,
    headwayQ: (bus: string) => `¿cada cuánto pasa ${bus}?`,
    sundayQ: (bus: string) => `¿${bus} circula los domingos y festivos?`,
    sundayYes: (first: string, last: string) => `sí, de ${first} a ${last}.`,
    sundayNo: "no, los domingos y festivos no circula.",
    stopsQ: (bus: string) => `¿por qué paradas pasa ${bus}?`,
    stopsBetween: (count: number, from: string, to: string) =>
      `por ${count} paradas, de ${from} a ${to}.`,
    stopsLoop: (count: number, from: string) =>
      `por ${count} paradas, en un recorrido circular desde ${from}.`,
    stopsOnly: (count: number) => `por ${count} paradas.`,
  },

  timetable: {
    loopFrom: (stop: string) => `circular desde ${stop}`,
    until: " hasta ",
    spokenFromTo: (first: string, last: string) => `de ${first} a ${last}`,
    announce: (label: string, route: string, departures: number) =>
      `${label}, ${route}: ${departures} salidas`,
    noRunLineSr: (phrase: string) => `esta línea no circula ${phrase}`,
    day: "día",
    route: "recorrido",
    routeCount: (count: number, phrase: string) => `(${count} ${phrase})`,
    noRunLine: (phrase: string) => `esta línea no circula ${phrase}.`,
    noRunRoute: (phrase: string) => `este recorrido no circula ${phrase}.`,
    stopCount: (count: number) => `${count} paradas`,
    departuresFrom: " · salidas de ",
    firstStop: "la primera parada",
    showStops: (count: number) => `ver las ${count} paradas`,
  },
};

export const linesCopy: Record<Lang, LinesCopy> = { ca, es };
