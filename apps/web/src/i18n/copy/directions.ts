import type { Lang } from "@moventis/shared";

const ca = {
  title: "com arribar-hi",
  close: "tanca les indicacions",
  backToOptions: "torna a les opcions",
  itinerary: "itinerari",
  swap: "intercanvia origen i destinació",
  myLocation: "la meva ubicació",
  mapPoint: "punt al mapa",
  from: "origen",
  to: "destinació",
  fieldLabel: (field: "from" | "to", label: string | null) =>
    `${field === "from" ? "origen" : "destinació"}: ${label ?? "per triar"}`,
  fieldEmpty: (field: "from" | "to"): string =>
    field === "from" ? "tria l'origen" : "on vols anar?",
  leavesAt: "surt a les",
  tomorrow: "demà",
  leaveNow: "surt ara",
  changeTime: "canvia l'hora",
  walkOnly: (distance: string) => `a peu, ${distance}`,
  pickHint: (field: "from" | "to") =>
    `toca el mapa o una parada per triar ${
      field === "from" ? "l'origen" : "la destinació"
    }`,
  cancel: "cancel·la",
  incomplete: "tria d'on surts i on vas",
  locating: "buscant la teva ubicació",
  noLocation: "no podem saber on ets. tria l'origen al mapa o per parada",
  outOfArea: "ets fora de lleida. tria l'origen al mapa o per parada",
  samePlace: "l'origen i la destinació són el mateix lloc",
  calculating: "calculant la ruta",
  noTimetable: "encara no tenim l'horari d'aquest dia",
  planFailed: "no s'ha pogut calcular la ruta",
  retry: "torna-ho a provar",
  missingLines: (lines: string[]) =>
    `sense horari per a ${lines.length === 1 ? "la línia" : "les línies"} ${lines.join(", ")}: no s'han tingut en compte`,
  options: "opcions",
  noCombination: (canWalk: boolean) =>
    `cap combinació en bus en les properes tres hores${
      canWalk ? ", però hi pots anar a peu" : ""
    }`,
  card: {
    route: "trajecte",
    walk: "a peu",
    leaveNow: "surt ara",
    leavesIn: (relative: string) => `surt d'aquí a ${relative}`,
    walking: (distance: string) => `${distance} a peu`,
    transfers: (n: number) => `${n} ${n === 1 ? "transbord" : "transbords"}`,
  },
  steps: {
    label: "indicacions pas a pas",
    walkTo: (distance: string) => `camina ${distance} fins a`,
    heading: (towards: string) => `direcció ${towards}`,
    stopsBetween: (n: number) => ` · ${n} ${n === 1 ? "parada" : "parades"}`,
    getOff: "baixa a",
    arrivalAt: "arribada a",
  },
  line: (code: string) => `línia ${code}`,
  picker: {
    placeholder: (field: "from" | "to") =>
      `${field === "from" ? "origen" : "destinació"}: nom de la parada`,
    searchLabel: (field: "from" | "to") =>
      `busca la parada d'${field === "from" ? "origen" : "arribada"}`,
    optionsFor: (field: "from" | "to") =>
      `opcions per a ${field === "from" ? "origen" : "destinació"}`,
    myLocation: "la meva ubicació",
    pickOnMap: "tria al mapa",
    searchFailed: "no s'ha pogut cercar. torna-ho a provar",
    loading: "carregant",
    none: "cap parada amb aquest nom",
    stops: "parades",
  },
};

export type DirectionsCopy = typeof ca;

const es: DirectionsCopy = {
  title: "cómo llegar",
  close: "cerrar indicaciones",
  backToOptions: "volver a las opciones",
  itinerary: "itinerario",
  swap: "intercambiar origen y destino",
  myLocation: "mi ubicación",
  mapPoint: "punto del mapa",
  from: "origen",
  to: "destino",
  fieldLabel: (field: "from" | "to", label: string | null) =>
    `${field === "from" ? "origen" : "destino"}: ${label ?? "por elegir"}`,
  fieldEmpty: (field: "from" | "to") =>
    field === "from" ? "elige el origen" : "¿adónde vas?",
  leavesAt: "salida a las",
  tomorrow: "mañana",
  leaveNow: "salir ahora",
  changeTime: "cambiar hora",
  walkOnly: (distance: string) => `a pie, ${distance}`,
  pickHint: (field: "from" | "to") =>
    `toca el mapa o una parada para elegir ${
      field === "from" ? "el origen" : "el destino"
    }`,
  cancel: "cancelar",
  incomplete: "elige de dónde sales y adónde vas",
  locating: "buscando tu ubicación",
  noLocation: "no sabemos dónde estás. elige el origen en el mapa o por parada",
  outOfArea: "estás fuera de lleida. elige el origen en el mapa o por parada",
  samePlace: "el origen y el destino son el mismo sitio",
  calculating: "calculando la ruta",
  noTimetable: "aún no tenemos el horario de este día",
  planFailed: "no se ha podido calcular la ruta",
  retry: "reintentar",
  missingLines: (lines: string[]) =>
    `sin horario para ${lines.length === 1 ? "la línea" : "las líneas"} ${lines.join(", ")}: no se han tenido en cuenta`,
  options: "opciones",
  noCombination: (canWalk: boolean) =>
    `no hay combinación en bus en las próximas tres horas${
      canWalk ? ", pero puedes ir a pie" : ""
    }`,
  card: {
    route: "trayecto",
    walk: "a pie",
    leaveNow: "sal ahora",
    leavesIn: (relative: string) => `sal en ${relative}`,
    walking: (distance: string) => `${distance} a pie`,
    transfers: (n: number) => `${n} ${n === 1 ? "transbordo" : "transbordos"}`,
  },
  steps: {
    label: "indicaciones paso a paso",
    walkTo: (distance: string) => `camina ${distance} hasta`,
    heading: (towards: string) => `dirección ${towards}`,
    stopsBetween: (n: number) => ` · ${n} ${n === 1 ? "parada" : "paradas"}`,
    getOff: "bájate en",
    arrivalAt: "llegada a",
  },
  line: (code: string) => `línea ${code}`,
  picker: {
    placeholder: (field: "from" | "to") =>
      `${field === "from" ? "origen" : "destino"}: nombre de la parada`,
    searchLabel: (field: "from" | "to") =>
      `busca la parada de ${field === "from" ? "origen" : "llegada"}`,
    optionsFor: (field: "from" | "to") =>
      `opciones para ${field === "from" ? "origen" : "destino"}`,
    myLocation: "mi ubicación",
    pickOnMap: "elegir en el mapa",
    searchFailed: "no se ha podido buscar. vuelve a intentarlo",
    loading: "cargando",
    none: "ninguna parada con este nombre",
    stops: "paradas",
  },
};

export const directionsCopy: Record<Lang, DirectionsCopy> = { ca, es };
