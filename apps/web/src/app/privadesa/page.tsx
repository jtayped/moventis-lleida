import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  // `ROOT_METADATA.title.template` turns this into "privadesa | bus lleida".
  title: "privadesa",
  description:
    "què desa aquest lloc al teu navegador, què no en surt mai, i com pots canviar-ho.",
  alternates: { canonical: "/privadesa" },
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="mt-8 space-y-3">
    <h2 className="text-lg font-semibold">{title}</h2>
    {children}
  </section>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
);

const List = ({ children }: { children: React.ReactNode }) => (
  <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm leading-relaxed">
    {children}
  </ul>
);

const External = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-foreground break-all underline underline-offset-4"
  >
    {href}
  </a>
);

const PrivadesaPage = () => {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 md:py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        torna al mapa
      </Link>

      <h1 className="mt-6 text-2xl font-bold">privadesa</h1>
      <p className="text-muted-foreground mt-1 text-xs">
        última actualització: setembre del 2026
      </p>

      <Section title="qui és responsable d'aquest lloc">
        <P>
          Aquest lloc web és un projecte personal de Joel Taylor Pedrós. Per a
          qualsevol consulta relacionada amb la privadesa, pots escriure a{" "}
          <a
            href="mailto:jtayped@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            jtayped@gmail.com
          </a>
          .
        </P>
      </Section>

      <Section title="quines dades es guarden al teu dispositiu">
        <P>
          Aquest lloc no requereix cap compte ni recull dades personals als
          nostres servidors. L&apos;única informació que es desa és al teu propi
          navegador (emmagatzematge local), i inclou:
        </P>
        <List>
          <li>
            Els identificadors de les parades que marquis com a
            &quot;preferides&quot;, perquè puguis retrobar-les en visites
            futures des d&apos;aquest mateix dispositiu.
          </li>
          <li>
            La teva decisió sobre l&apos;avís d&apos;emmagatzematge local (si
            l&apos;has acceptat o rebutjat).
          </li>
          <li>
            Les teves preferències de la configuració, entre elles si has
            desactivat l&apos;analítica anònima: el senyal que l&apos;apaga es
            desa en aquest dispositiu, i és el que fa que no s&apos;enviï res.
          </li>
        </List>
        <P>
          Aquestes dades no surten mai del teu dispositiu: no hi ha cap servidor
          que les rebi ni les emmagatzemi.
        </P>
      </Section>

      <Section title="cookies i seguiment">
        <P>
          No fem servir cookies de seguiment ni publicitat. Comptem visites de
          forma anònima amb una eina pròpia, i pots desactivar-ho a la
          configuració.
        </P>
      </Section>

      <Section title="analítica (umami)">
        <P>
          Per saber si el lloc es fa servir i què s&apos;hi consulta, fem servir
          umami, que allotgem nosaltres mateixos a
          analytics.joeltaylor.business. No fa servir cookies ni cap
          identificador que et segueixi entre visites, i la teva adreça IP no es
          desa: només s&apos;utilitza de pas per deduir el país.
        </P>
        <P>
          Les dades no van a parar a cap tercer —es queden al nostre servidor— i
          són agregades: quines pàgines es visiten, quines línies i parades
          s&apos;obren, i dades aproximades de navegador i país. No hi ha res
          que permeti identificar-te, i mai desem el text que escrius al
          cercador.
        </P>
        <P>
          Pots desactivar-ho quan vulguis des del tauler de configuració, a
          l&apos;apartat &quot;privadesa i dades&quot;. Si vols saber què recull
          exactament l&apos;eina: <External href="https://umami.is/docs/faq" />
        </P>
      </Section>

      <Section title="Google Maps">
        <P>
          El mapa d&apos;aquest lloc es mostra mitjançant l&apos;API de Google
          Maps. Per carregar-lo, el teu navegador es connecta directament als
          servidors de Google, que poden rebre la teva adreça IP i aplicar les
          seves pròpies polítiques d&apos;emmagatzematge. Aquest ús és necessari
          perquè el mapa funcioni, i queda subjecte a la política de privadesa
          de Google: <External href="https://policies.google.com/privacy" />
        </P>
      </Section>

      <Section title="la teva elecció sobre les parades preferides">
        <P>
          Quan visites el lloc per primer cop, et preguntem si vols que desem
          les teves parades preferides en aquest dispositiu. Si ho rebutges:
        </P>
        <List>
          <li>
            Eliminem immediatament qualsevol parada preferida ja desada en
            aquest dispositiu.
          </li>
          <li>No es tornarà a desar res fins que ho tornis a acceptar.</li>
        </List>
        <P>
          Pots canviar aquesta decisió en qualsevol moment des de l&apos;enllaç
          &quot;preferències de privadesa&quot;.
        </P>
      </Section>

      <Section title="els teus drets">
        <P>
          Com que no guardem cap dada als nostres servidors, la manera més
          directa d&apos;exercir els teus drets d&apos;accés o supressió és
          esborrar les dades del lloc des de la configuració del teu navegador,
          o rebutjar l&apos;avís d&apos;aquest lloc. Per a qualsevol altra
          consulta, escriu-nos a{" "}
          <a
            href="mailto:jtayped@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            jtayped@gmail.com
          </a>
          .
        </P>
      </Section>

      <Section title="canvis futurs">
        <P>
          Si en el futur afegim funcionalitats que requereixin desar més
          informació (per exemple, un sistema d&apos;inici de sessió),
          actualitzarem aquest avís i, si cal, et tornarem a demanar el
          consentiment.
        </P>
      </Section>
    </main>
  );
};

export default PrivadesaPage;
