import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { ContentPage } from "@/components/content/content-page";
import { External, List, P, Section } from "@/components/content/prose";
import { Heart, Mail, RefreshCw, Shield } from "lucide-react";
import { AuthorCard } from "@/components/content/author-card";
import { FOCUS_RING } from "@/components/content/styles";
import { LineBadge } from "@/components/content/line-badge";
import { compareByLineCode } from "@/lib/lines";
import { cn } from "@/lib/utils";
import { asLang, type LangParams } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import {
  DAY_TYPE_LABELS,
  DAY_TYPE_ORDER,
  formatServiceTime,
  joinCatalan,
} from "@/lib/service-time";
import { api } from "@/trpc/server";

// The last-bus table comes from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  return pageMetadata({
    title: "informació del bus urbà de lleida",
    description:
      "com funciona el bus urbà de lleida (autobusos de lleida, grup moventis): a quina hora passa l'últim bus, si hi ha bus els diumenges i festius, el bus nocturn n1, temps real, contacte i objectes perduts.",
    path: "/informacio",
    lang: asLang((await params).lang),
  });
}

/** Last time the facts on this page were checked against their sources. */
const REVIEWED_ON = "3 d'octubre del 2026";

const InternalLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className={cn(
      "text-foreground rounded-sm underline underline-offset-4",
      FOCUS_RING,
    )}
  >
    {children}
  </Link>
);

type LineIndex = Awaited<ReturnType<typeof api.content.lines>>;

/**
 * The lines with a stored timetable for any of the days shown, in line order.
 * The n1 runs one night a week and often has none in the window; listing it
 * as "no circula" every day would say it does not exist.
 */
const timetabled = (index: LineIndex) =>
  [...index.lines]
    .sort(compareByLineCode)
    .filter((line) => Object.keys(line.summary).length > 0);

/**
 * The last departure of every line, per day type, as a table: the answer to
 * "a quina hora passa l'últim bus", which is what this page gets searched for.
 */
const LastBusTable = ({ index }: { index: LineIndex }) => {
  const types = DAY_TYPE_ORDER.filter((type) => index.days[type]);
  const lines = timetabled(index);
  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-left">
          <tr>
            <th scope="col" className="p-3 font-medium">
              línia
            </th>
            {types.map((type) => (
              <th key={type} scope="col" className="p-3 font-medium">
                {DAY_TYPE_LABELS[type]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {lines.map((line) => (
            <tr key={line.code}>
              <th scope="row" className="p-2 text-left font-normal">
                <Link
                  href={`/linies/${line.code}`}
                  className={cn("inline-flex rounded-md", FOCUS_RING)}
                >
                  <LineBadge
                    code={line.code}
                    color={line.color}
                    className="size-8 text-xs"
                  />
                  <span className="sr-only">línia {line.code}</span>
                </Link>
              </th>
              {types.map((type) => {
                const day = line.summary[type];
                return (
                  <td
                    key={type}
                    className={cn(
                      "p-3 tabular-nums",
                      !day && "text-muted-foreground",
                    )}
                  >
                    {day ? formatServiceTime(day.last) : "no circula"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * The lines with no sunday departures as a clause: ", i la 9 i la 16 no
 * circulen". Empty when every line runs.
 */
const noSundayClause = (index: LineIndex) => {
  const codes = timetabled(index)
    .filter((line) => !line.summary.sunday)
    .map((line) => `la ${line.code}`);
  if (codes.length === 0) return "";
  return `, i ${joinCatalan(codes)} no ${codes.length === 1 ? "circula" : "circulen"}`;
};

const InformacioPage = async ({ params }: LangParams) => {
  const lang = asLang((await params).lang);
  const index = await api.content.lines();
  const noSunday = index.days.sunday ? noSundayClause(index) : "";
  return (
    <ContentPage
      lang={lang}
      credit={false}
      title="el bus urbà de lleida"
      updated={`revisat el ${REVIEWED_ON}`}
    >
      <div className="mt-6">
        <P>
          aquesta web mostra els autobusos urbans de lleida sobre un mapa, amb
          les properes arribades a cada parada. fa servir les mateixes dades
          públiques que la web de moventis, però no és oficial. aquí trobaràs
          com funciona la xarxa i on adreçar-te per a tot el que la web no
          resol.
        </P>
      </div>

      <Section title="qui porta els busos" id="operador">
        <P>
          els autobusos urbans de lleida els opera autobusos de lleida, una
          empresa del grup moventis. les línies interurbanes que surten de
          lleida cap a l'albagés, el cogul, torres de segre i alcarràs són de
          sarbus, també de moventis, i no surten en aquesta web.
        </P>
      </Section>

      <Section title="les línies" id="linies">
        <P>
          unes quantes línies fan un recorregut circular, com la 1 (interior) o
          la 20 (ronda). les altres van i tornen pel mateix camí, amb parades a
          banda i banda del carrer. pots veure-les totes, amb el recorregut i
          les parades, al <InternalLink href="/">mapa</InternalLink>.
        </P>
      </Section>

      <Section title="a quina hora passa l'últim bus?" id="ultim-bus">
        <P>
          la majoria de línies fan l&apos;últim viatge cap a les 10 o les 11 de
          la nit. és l&apos;hora de sortida de la primera parada; a la resta, el
          bus hi passa més tard.
        </P>
        {index.lines.length > 0 && <LastBusTable index={index} />}
      </Section>

      <Section title="hi ha bus els diumenges i festius?" id="diumenges">
        <P>
          sí, però passen menys busos que els dies feiners
          {noSunday}. els festius solen tenir l&apos;horari dels diumenges.
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
          mentre avança. quan encara no ha sortit, és l'hora de l'horari
          oficial. a la fitxa de cada parada les dues es distingeixen, i les
          hores es refresquen cada 30 segons.
        </P>
        <P>
          les parades també tenen un codi qr que porta al temps d&apos;arribada
          oficial.
        </P>
      </Section>

      <Section title="accessibilitat" id="accessibilitat">
        <P>
          segons moventis, totes les línies urbanes tenen vehicles adaptats per
          a persones amb mobilitat reduïda.
        </P>
      </Section>

      <Section title="tarifes" id="tarifes">
        <P>
          un viatge amb bitllet senzill costa 1,20 €, i les targetes de la
          ciutat i de l'atm surten més a compte si viatges sovint. tots els
          preus, amb les fonts, són a{" "}
          <InternalLink href="/tarifes">tarifes</InternalLink>.
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
        <AuthorCard />
        <ul className="text-muted-foreground space-y-3 text-sm leading-relaxed">
          <li className="flex items-start gap-3">
            <Heart size={16} aria-hidden className="mt-0.5 shrink-0" />
            projecte personal, sense publicitat i sense relació amb moventis,
            autobusos de lleida ni la paeria.
          </li>
          <li className="flex items-start gap-3">
            <RefreshCw size={16} aria-hidden className="mt-0.5 shrink-0" />
            les línies i les parades s&apos;actualitzen cada nit des de
            moventis.es; les arribades, en directe quan obres una parada.
          </li>
          <li className="flex items-start gap-3">
            <Mail size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              has vist un error? escriu a{" "}
              <a
                href="mailto:jtayped@gmail.com"
                className={cn(
                  "text-foreground rounded-sm underline underline-offset-4",
                  FOCUS_RING,
                )}
              >
                jtayped@gmail.com
              </a>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Shield size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              què es desa al teu navegador, i què no:{" "}
              <InternalLink href="/privadesa">privadesa</InternalLink>
            </span>
          </li>
        </ul>
      </Section>
    </ContentPage>
  );
};

export default InformacioPage;
