import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content/content-page";
import { External, List, P, Section } from "@/components/content/prose";
import {
  AUTHOR_NAME,
  GITHUB_URL,
  KO_FI_URL,
  PORTFOLIO_URL,
} from "@/lib/project-links";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "informació del bus urbà de lleida",
  description:
    "com funciona el bus urbà de lleida (autobusos de lleida, grup moventis): horaris, bus nocturn n1, temps real, accessibilitat, contacte i objectes perduts.",
  path: "/informacio",
});

/** Last time the facts on this page were checked against their sources. */
const REVIEWED_ON = "3 d'octubre del 2026";

const InternalLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link href={href} className="text-foreground underline underline-offset-4">
    {children}
  </Link>
);

const InformacioPage = () => (
  <ContentPage
    title="el bus urbà de lleida"
    updated={`revisat el ${REVIEWED_ON}`}
  >
    <div className="mt-6">
      <P>
        aquesta web mostra els autobusos urbans de lleida sobre un mapa, amb les
        properes arribades a cada parada. fa servir les mateixes dades públiques
        que la web de moventis, però no és oficial. aquí trobaràs com funciona
        la xarxa i on adreçar-te per a tot el que la web no resol.
      </P>
    </div>

    <Section title="qui porta els busos" id="operador">
      <P>
        els autobusos urbans de lleida els opera autobusos de lleida, una
        empresa del grup moventis. les línies interurbanes que surten de lleida
        cap a l'albagés, el cogul, torres de segre i alcarràs són de sarbus,
        també de moventis, i no surten en aquesta web.
      </P>
    </Section>

    <Section title="les línies" id="linies">
      <P>
        unes quantes línies fan un recorregut circular, com la 1 (interior) o la
        20 (ronda). les altres van i tornen pel mateix camí, amb parades a banda
        i banda del carrer. pots veure-les totes, amb el recorregut i les
        parades, al <InternalLink href="/">mapa</InternalLink>.
      </P>
    </Section>

    <Section title="horaris" id="horaris">
      <P>
        la majoria de línies comencen a circular poc abans de les 7 del matí i
        fan l'últim viatge cap a les 10 o les 11 de la nit. la 9 (polígons) i la
        16 (ciutat jardí) acaben a la tarda. els dissabtes, diumenges i festius
        passen menys busos, i algunes línies no circulen. l'horari exacte de
        cada línia depèn del dia, i el mapa marca les que no circulen avui.
      </P>
      <P>
        la línia n1 és el bus nocturn. fa el recorregut magraners - secà -
        balàfia entre les 22.50 i les 6.00, la nit de dissabte a diumenge.
      </P>
    </Section>

    <Section title="com funciona el temps real" id="temps-real">
      <P>
        moventis publica, per a cada parada, els propers busos de cada línia.
        quan el bus ja ha sortit, l'hora és una estimació que s'actualitza
        mentre avança. quan encara no ha sortit, és l'hora de l'horari oficial.
        a la fitxa de cada parada les dues es distingeixen, i les hores es
        refresquen cada 30 segons.
      </P>
      <P>
        les parades també tenen un codi qr que porta al temps d&apos;arribada
        oficial.
      </P>
    </Section>

    <Section title="accessibilitat" id="accessibilitat">
      <P>
        segons moventis, totes les línies urbanes tenen vehicles adaptats per a
        persones amb mobilitat reduïda.
      </P>
    </Section>

    <Section title="tarifes" id="tarifes">
      <P>
        un viatge amb bitllet senzill costa 1,20 €, i les targetes de la ciutat
        i de l'atm surten més a compte si viatges sovint. tots els preus, amb
        les fonts, són a <InternalLink href="/tarifes">tarifes</InternalLink>.
      </P>
    </Section>

    <Section title="contacte, incidències i objectes perduts" id="contacte">
      <List>
        <li>
          atenció al viatger de moventis:{" "}
          <External href="https://www.moventis.es/ca/benvingut-atencio-al-viatger">
            moventis.es
          </External>
          .
        </li>
        <li>
          incidències del servei publicades per moventis:{" "}
          <External href="https://www.moventis.es/ca/informacio-practica/incidencies">
            incidències
          </External>
          .
        </li>
        <li>
          objectes perduts al bus:{" "}
          <External href="https://www.moventis.es/es/informacion-practica/objetos-perdidos">
            formulari de moventis
          </External>
          , triant autobusos de lleida com a companyia.
        </li>
        <li>
          targetes de l'atm: telèfon 900 10 68 48, o{" "}
          <External href="https://atmlleida.cat/">atmlleida.cat</External>.
        </li>
        <li>
          informació municipal sobre el bus:{" "}
          <External href="https://www.paeria.cat/ca/serveis/mobilitat/mobilitat/lleida-en-bus/en-transport-public">
            la paeria
          </External>
          .
        </li>
      </List>
    </Section>

    <Section title="sobre aquesta web" id="sobre">
      <P>
        és un projecte personal de{" "}
        <External href={PORTFOLIO_URL}>{AUTHOR_NAME}</External>, sense relació
        amb moventis, autobusos de lleida ni la paeria. les línies i les parades
        s'actualitzen cada nit a partir de moventis.es, i les arribades es
        consulten en directe cada vegada que obres una parada. si trobes un
        error, escriu a{" "}
        <a
          href="mailto:jtayped@gmail.com"
          className="text-foreground underline underline-offset-4"
        >
          jtayped@gmail.com
        </a>
        . què es desa al teu navegador, i què no, és a{" "}
        <InternalLink href="/privadesa">privadesa</InternalLink>.
      </P>
      <P>
        el codi és públic a <External href={GITHUB_URL}>github</External>. la
        web no té publicitat. si et fa servei, pots{" "}
        <External href={KO_FI_URL}>fer una donació a ko-fi</External>.
      </P>
    </Section>
  </ContentPage>
);

export default InformacioPage;
