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
  fieldEmpty: (field: "from" | "to") =>
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

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: DirectionsCopy = ca;

export const directionsCopy: Record<Lang, DirectionsCopy> = { ca, es };
