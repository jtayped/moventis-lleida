import type { Lang } from "@moventis/shared";

/**
 * Fares, curated by hand.
 *
 * Not scraped on purpose. Moventis' `tarifas` feed only indexes Drupal pages,
 * the prices themselves sit in each page's HTML, and they change about once a
 * year. A scraper that parses that HTML would break silently on the first
 * redesign; a dated list with its sources breaks loudly, on the review date.
 *
 * When a source changes: update the figures, `reviewedOn`, and nothing else.
 * `docs/sources.md` lists every source this file depends on. Card names
 * (t-jove, t-mes...) are product names and stay identical in every language;
 * the two descriptive names are translated. Names are also the fares page's
 * anchors, so those two have a different anchor per language.
 */

export interface Fare {
  name: string;
  price: string;
  /** Who it is for and how it works, in our words. */
  detail: string;
}

const ca = {
  /** When every figure below was last checked against its source. */
  reviewedOn: "3 d'octubre del 2026",

  title: "tarifes del bus urbà de lleida",
  metaTitle:
    "tarifes del bus urbà de lleida: bitllet, t-jove, t-mes i t-nostra",
  description:
    "quant costa el bus a lleida: bitllet senzill, t-estudiant, t-nostra, t-temps i les targetes integrades de l'atm (t-10, t-mes, t-jove, t-16), amb les fonts oficials.",
  updated: (date: string) => `revisat el ${date}`,

  urbanSource: {
    href: "https://www.moventis.es/ca/tarifas/lleida-urba",
    label: "moventis · lleida - urbà",
  },

  /**
   * The city's own fares. Every card except the single ticket is for people
   * registered (`empadronades`) in Lleida, and each costs `urbanCardCost` to
   * issue.
   */
  urbanFares: [
    {
      name: "bitllet senzill",
      price: "1,20 €",
      detail: "un viatge. es compra al mateix autobús.",
    },
    {
      name: "t-estudiant",
      price: "2,50 € (10 viatges)",
      detail:
        "per a estudiants de 16 a 25 anys empadronats a lleida. també per a estudiants de 4 a 25 anys que estudien a la ciutat sense estar-hi empadronats.",
    },
    {
      name: "t-jove de la ciutat",
      price: "gratuïta",
      detail:
        "per a joves de 13 a 16 anys empadronats a lleida. 8 viatges gratuïts els dies lectius i preu d'estudiant la resta de dies. no és la t-jove de l'atm.",
    },
    {
      name: "t-nostra a",
      price: "gratuïta",
      detail:
        "per a persones prejubilades o jubilades des dels 62 anys, o amb una incapacitat absoluta del 65% o més, empadronades a lleida i amb ingressos per sota de l'iprem.",
    },
    {
      name: "t-nostra b",
      price: "1,45 € (10 viatges)",
      detail:
        "les mateixes condicions que la t-nostra a, amb ingressos per sobre de l'iprem. es recarrega amb 10, 20 o 30 viatges.",
    },
    {
      name: "t-temps",
      price: "gratuïta",
      detail:
        "per a persones de més de 65 anys empadronades a lleida. viatges il·limitats. no es recarrega.",
    },
  ] satisfies Fare[],

  urbanCardCost: "2,00 €",

  atmSource: {
    href: "https://atmlleida.cat/tarifes/",
    label: "atm lleida · tarifes",
  },

  /** The ATM's validity window for the figures in `atmFares`. */
  atmValidity: "del 15 de gener al 31 de desembre del 2026",

  /**
   * Integrated fares of the ATM de l'Àrea de Lleida, valid on the city's buses
   * and on every other integrated operator. Prices are the 1-zone column, which
   * is what a trip inside Lleida costs, except the T-JOVE, which only exists as
   * an all-zones card.
   */
  atmFares: [
    {
      name: "t-10",
      price: "5,50 €",
      detail:
        "10 viatges. la pot fer servir més d'una persona alhora. val fins al proper canvi de tarifes.",
    },
    {
      name: "t-10/30",
      price: "4,40 €",
      detail: "10 viatges en 30 dies, per a una sola persona.",
    },
    {
      name: "t-50/30",
      price: "16,80 €",
      detail: "50 viatges en 30 dies, per a una sola persona.",
    },
    {
      name: "t-mes",
      price: "22,10 €",
      detail: "viatges il·limitats durant 30 dies. targeta personalitzada.",
    },
    {
      name: "t-jove",
      price: "44,15 €",
      detail:
        "de 4 a 29 anys. viatges il·limitats a totes les zones durant 90 dies.",
    },
    {
      name: "t-16",
      price: "gratuïta",
      detail:
        "de 4 a 16 anys. viatges il·limitats dins de la zona on viu el titular.",
    },
  ] satisfies Fare[],

  atmCardCosts: {
    anonymous: "3,50 €",
    personalised: "4,00 €",
  },

  /** Time allowed for free transfers on a 1-zone integrated trip. */
  atmTransferWindow: "1 hora i 15 minuts",
};

export type FaresCopy = typeof ca;

const es: FaresCopy = {
  reviewedOn: "3 de octubre de 2026",

  title: "tarifas del bus urbano de lleida",
  metaTitle:
    "tarifas del bus urbano de lleida: billete, t-jove, t-mes y t-nostra",
  description:
    "cuánto cuesta el bus en lleida: billete sencillo, t-estudiant, t-nostra, t-temps y las tarjetas integradas de la atm (t-10, t-mes, t-jove, t-16), con las fuentes oficiales. web no oficial.",
  updated: (date: string) => `revisado el ${date}`,

  urbanSource: ca.urbanSource,

  urbanFares: [
    {
      name: "billete sencillo",
      price: "1,20 €",
      detail: "un viaje. se compra en el mismo autobús.",
    },
    {
      name: "t-estudiant",
      price: "2,50 € (10 viajes)",
      detail:
        "para estudiantes de 16 a 25 años empadronados en lleida. también para estudiantes de 4 a 25 años que estudian en la ciudad sin estar empadronados en ella.",
    },
    {
      name: "t-jove de la ciudad",
      price: "gratuita",
      detail:
        "para jóvenes de 13 a 16 años empadronados en lleida. 8 viajes gratis los días lectivos y precio de estudiante el resto de días. no es la t-jove de la atm.",
    },
    {
      name: "t-nostra a",
      price: "gratuita",
      detail:
        "para personas prejubiladas o jubiladas desde los 62 años, o con una incapacidad absoluta del 65% o más, empadronadas en lleida y con ingresos por debajo del iprem.",
    },
    {
      name: "t-nostra b",
      price: "1,45 € (10 viajes)",
      detail:
        "las mismas condiciones que la t-nostra a, con ingresos por encima del iprem. se recarga con 10, 20 o 30 viajes.",
    },
    {
      name: "t-temps",
      price: "gratuita",
      detail:
        "para personas de más de 65 años empadronadas en lleida. viajes ilimitados. no se recarga.",
    },
  ],

  urbanCardCost: ca.urbanCardCost,

  atmSource: ca.atmSource,

  atmValidity: "del 15 de enero al 31 de diciembre de 2026",

  atmFares: [
    {
      name: "t-10",
      price: "5,50 €",
      detail:
        "10 viajes. la puede usar más de una persona a la vez. vale hasta el próximo cambio de tarifas.",
    },
    {
      name: "t-10/30",
      price: "4,40 €",
      detail: "10 viajes en 30 días, para una sola persona.",
    },
    {
      name: "t-50/30",
      price: "16,80 €",
      detail: "50 viajes en 30 días, para una sola persona.",
    },
    {
      name: "t-mes",
      price: "22,10 €",
      detail: "viajes ilimitados durante 30 días. tarjeta personalizada.",
    },
    {
      name: "t-jove",
      price: "44,15 €",
      detail:
        "de 4 a 29 años. viajes ilimitados en todas las zonas durante 90 días.",
    },
    {
      name: "t-16",
      price: "gratuita",
      detail:
        "de 4 a 16 años. viajes ilimitados dentro de la zona donde vive el titular.",
    },
  ],

  atmCardCosts: ca.atmCardCosts,

  atmTransferWindow: "1 hora y 15 minutos",
};

export const faresCopy: Record<Lang, FaresCopy> = { ca, es };
