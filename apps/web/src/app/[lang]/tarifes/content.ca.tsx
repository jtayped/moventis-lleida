import { FareList } from "@/components/content/fare-list";
import { External, List, P, Section } from "@/components/content/prose";
import type { FaresCopy } from "@/i18n/copy/fares";

export const TarifesContent = ({ t }: { t: FaresCopy }) => (
  <>
    <div className="mt-6">
      <P>
        als autobusos urbans de lleida pots pagar amb un bitllet senzill, amb
        una de les targetes de la ciutat o amb les targetes integrades de l'atm
        de l'àrea de lleida, que també valen per als busos interurbans i el
        tren. si viatges sovint, una targeta surt més a compte que el bitllet.
      </P>
    </div>

    <Section title="tarifes de la ciutat" id="ciutat">
      <FareList fares={t.urbanFares} />
      <P>
        fer qualsevol d'aquestes targetes costa {t.urbanCardCost}. font:{" "}
        <External href={t.urbanSource.href}>{t.urbanSource.label}</External>.
      </P>
    </Section>

    <Section title="targetes integrades de l'atm" id="atm">
      <P>
        preus bonificats d'una zona, vigents {t.atmValidity}. un viatge dins de
        lleida és d'una zona. amb aquestes targetes, els transbordaments són
        gratuïts durant {t.atmTransferWindow} des de la primera validació.
      </P>
      <FareList fares={t.atmFares} />
      <P>
        la targeta anònima costa {t.atmCardCosts.anonymous} i la personalitzada{" "}
        {t.atmCardCosts.personalised}. hi ha descomptes per a famílies nombroses
        i monoparentals i per a persones a l'atur. font i preus de 2, 3 i 4
        zones: <External href={t.atmSource.href}>{t.atmSource.label}</External>.
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
        lleida el {t.reviewedOn}. si un preu no et quadra, mana el de la font
        oficial.
      </P>
    </Section>
  </>
);
