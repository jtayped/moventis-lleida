import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";
import { External, List, P, Section } from "@/components/content/prose";
import {
  ATM_CARD_COSTS,
  ATM_FARES,
  ATM_SOURCE,
  ATM_TRANSFER_WINDOW,
  ATM_VALIDITY,
  REVIEWED_ON,
  URBAN_CARD_COST,
  URBAN_FARES,
  URBAN_SOURCE,
  type Fare,
} from "@/content/tarifes";
import { asLang, langStaticParams, type LangParams } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import { slugify } from "@/lib/stops";

export const generateStaticParams = langStaticParams;

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  return pageMetadata({
    title: "tarifes del bus urbà de lleida: bitllet, t-jove, t-mes i t-nostra",
    description:
      "quant costa el bus a lleida: bitllet senzill, t-estudiant, t-nostra, t-temps i les targetes integrades de l'atm (t-10, t-mes, t-jove, t-16), amb les fonts oficials.",
    path: "/tarifes",
    lang: asLang((await params).lang),
  });
}

/**
 * Each fare under its own heading, with an anchor: card names ("t-jove",
 * "t-nostra") are what people search for, and a heading is what a search
 * engine matches a query against and can link to.
 */
const FareList = ({ fares }: { fares: Fare[] }) => (
  <ul className="border-border divide-border divide-y rounded-xl border">
    {fares.map((fare) => (
      <li
        key={fare.name}
        id={slugify(fare.name)}
        className="grid scroll-mt-6 grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 p-4"
      >
        <h3 className="text-sm font-semibold">{fare.name}</h3>
        <p className="text-sm font-semibold tabular-nums">{fare.price}</p>
        <p className="text-muted-foreground col-span-2 text-sm leading-relaxed">
          {fare.detail}
        </p>
      </li>
    ))}
  </ul>
);

const TarifesPage = async ({ params }: LangParams) => (
  <ContentPage
    lang={asLang((await params).lang)}
    title="tarifes del bus urbà de lleida"
    updated={`revisat el ${REVIEWED_ON}`}
  >
    <div className="mt-6">
      <P>
        als autobusos urbans de lleida pots pagar amb un bitllet senzill, amb
        una de les targetes de la ciutat o amb les targetes integrades de l'atm
        de l'àrea de lleida, que també valen per als busos interurbans i el
        tren. si viatges sovint, una targeta surt més a compte que el bitllet.
      </P>
    </div>

    <Section title="tarifes de la ciutat" id="ciutat">
      <FareList fares={URBAN_FARES} />
      <P>
        fer qualsevol d'aquestes targetes costa {URBAN_CARD_COST}. font:{" "}
        <External href={URBAN_SOURCE.href}>{URBAN_SOURCE.label}</External>.
      </P>
    </Section>

    <Section title="targetes integrades de l'atm" id="atm">
      <P>
        preus bonificats d'una zona, vigents {ATM_VALIDITY}. un viatge dins de
        lleida és d'una zona. amb aquestes targetes, els transbordaments són
        gratuïts durant {ATM_TRANSFER_WINDOW} des de la primera validació.
      </P>
      <FareList fares={ATM_FARES} />
      <P>
        la targeta anònima costa {ATM_CARD_COSTS.anonymous} i la personalitzada{" "}
        {ATM_CARD_COSTS.personalised}. hi ha descomptes per a famílies nombroses
        i monoparentals i per a persones a l'atur. font i preus de 2, 3 i 4
        zones: <External href={ATM_SOURCE.href}>{ATM_SOURCE.label}</External>.
      </P>
    </Section>

    <Section title="on es compren i es recarreguen" id="on-comprar">
      <List>
        <li>el bitllet senzill es compra a dalt del bus.</li>
        <li>
          les targetes de l'atm es fan i es recarreguen a l'oficina principal
          d'atenció al client, a la plaça d'espanya, 1 (entrada per l'avinguda
          de madrid), de dilluns a divendres de 8.00 a 19.45, a l'oficina de
          l'estació d'autobusos i a molts estancs i botigues de la ciutat:{" "}
          <External href="https://atmlleida.cat/xarxa-de-venda-i-recarrega/">
            llista de punts de venda
          </External>
          .
        </li>
        <li>
          telèfon d'informació de l'atm lleida:{" "}
          <a
            href="tel:+34900106848"
            className="text-foreground underline underline-offset-4"
          >
            900 10 68 48
          </a>
          .
        </li>
      </List>
    </Section>

    <Section title="abans de pagar" id="avis">
      <P>
        aquesta pàgina recull els preus publicats per moventis i per l'atm
        lleida el {REVIEWED_ON}. si un preu no et quadra, mana el de la font
        oficial.
      </P>
    </Section>
  </ContentPage>
);

export default TarifesPage;
