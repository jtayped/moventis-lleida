import type { Lang } from "@moventis/shared";

const ca = {
  siteName: "bus urbà lleida",
  /** Appended to every page title, also by hand to the Open Graph and Twitter ones. */
  titleSuffix: " | bus lleida",
  alternateName: "horaris bus lleida",
  homeTitle: "moventis lleida en temps real: mapa del bus urbà",
  description:
    "on és el teu bus? els autobusos urbans de lleida en temps real sobre un mapa, amb les properes arribades a cada parada i els horaris de totes les línies. web no oficial, amb les dades públiques de moventis.",
  keywords: [
    "bus lleida",
    "horaris bus",
    "moventis",
    "autobús lleida",
    "temps real",
    "parades lleida",
    "línies bus lleida",
  ],
  appleWebAppTitle: "horaris bus urbà lleida | temps real",
  shareTitle: "horaris bus urbà lleida",
  shareDescription:
    "consulta els horaris de l'autobús urbà de lleida en temps real.",
  shareImageAlt: "imatge de l'aplicació d'horaris de bus de lleida",
  ogLocale: "ca_ES",
  webAppDescription:
    "mapa en temps real dels autobusos urbans de lleida, amb les properes arribades a cada parada.",
};

export type SiteCopy = typeof ca;

const es: SiteCopy = {
  siteName: "bus urbano lleida",
  titleSuffix: " | bus lleida",
  alternateName: "horarios bus lleida",
  homeTitle: "moventis lleida en tiempo real: mapa del bus urbano",
  description:
    "¿dónde está tu bus? los autobuses urbanos de lleida en tiempo real sobre un mapa, con las próximas llegadas a cada parada y los horarios de todas las líneas. web no oficial, con los datos públicos de moventis.",
  keywords: [
    "bus lleida",
    "autobuses lleida",
    "horarios bus",
    "moventis",
    "moventis lleida tiempo real",
    "bus en tiempo real",
    "paradas lleida",
    "líneas bus lleida",
  ],
  appleWebAppTitle: "horarios bus urbano lleida | tiempo real",
  shareTitle: "horarios bus urbano lleida",
  shareDescription:
    "consulta los horarios del autobús urbano de lleida en tiempo real.",
  shareImageAlt: "imagen de la aplicación de horarios de bus de lleida",
  ogLocale: "es_ES",
  webAppDescription:
    "mapa en tiempo real de los autobuses urbanos de lleida, con las próximas llegadas a cada parada.",
};

export const siteCopy: Record<Lang, SiteCopy> = { ca, es };
