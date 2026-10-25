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
 * `docs/sources.md` lists every source this file depends on. Fare names are
 * product names and stay identical in every language; they are also the
 * anchors of the fares page.
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

// Filled in by the Spanish translation; Catalan until then so nothing renders blank.
const es: FaresCopy = ca;

export const faresCopy: Record<Lang, FaresCopy> = { ca, es };
