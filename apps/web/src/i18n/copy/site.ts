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

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: SiteCopy = ca;

export const siteCopy: Record<Lang, SiteCopy> = { ca, es };
