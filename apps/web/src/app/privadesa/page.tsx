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
        última actualització: agost del 2026
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
        </List>
        <P>
          Aquestes dades no surten mai del teu dispositiu: no hi ha cap servidor
          que les rebi ni les emmagatzemi.
        </P>
      </Section>

      <Section title="cookies i seguiment">
        <P>
          No fem servir cookies de seguiment, analítica de tercers ni
          publicitat.
        </P>
      </Section>

      <Section title="analítica de rendiment (Vercel)">
        <P>
          Per entendre com funciona el lloc i detectar errors, fem servir Vercel
          Analytics i Vercel Speed Insights. Aquestes eines no fan servir
          cookies ni desen res al teu dispositiu: recullen dades agregades i
          anònimes (pàgines visitades, procedència aproximada, mètriques de
          rendiment) que Vercel processa per nosaltres. Més informació a la
          política de privadesa de Vercel:{" "}
          <External href="https://vercel.com/docs/analytics/privacy-policy" />
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
