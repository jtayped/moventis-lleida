import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";
import { External, List, P, Section } from "@/components/content/prose";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "privadesa",
  description:
    "què desa aquest lloc al teu navegador, què no en surt mai, i com pots canviar-ho.",
  path: "/privadesa",
});

const PrivadesaPage = () => {
  return (
    <ContentPage
      title="privadesa"
      updated="última actualització: setembre del 2026"
    >
      <Section title="qui és responsable d'aquest lloc">
        <P>
          aquest lloc web és un projecte personal de joel taylor pedrós. per a
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
          aquest lloc no requereix cap compte ni recull dades personals als
          nostres servidors. l&apos;única informació que es desa és al teu propi
          navegador (emmagatzematge local), i inclou:
        </P>
        <List>
          <li>
            els identificadors de les parades que marquis com a
            &quot;preferides&quot;, perquè puguis retrobar-les en visites
            futures des d&apos;aquest mateix dispositiu.
          </li>
          <li>
            la teva decisió sobre l&apos;avís d&apos;emmagatzematge local (si
            l&apos;has acceptat o rebutjat).
          </li>
          <li>
            les teves preferències de la configuració, entre elles si has
            desactivat l&apos;analítica anònima: el senyal que l&apos;apaga es
            desa en aquest dispositiu, i és el que fa que no s&apos;enviï res.
          </li>
        </List>
        <P>
          aquestes dades no surten mai del teu dispositiu: no hi ha cap servidor
          que les rebi ni les emmagatzemi.
        </P>
      </Section>

      <Section title="cookies i seguiment">
        <P>
          no fem servir cookies de seguiment ni publicitat. comptem visites de
          forma anònima amb una eina pròpia, i pots desactivar-ho a la
          configuració.
        </P>
      </Section>

      <Section title="analítica (umami)">
        <P>
          per saber si el lloc es fa servir i què s&apos;hi consulta, fem servir
          umami, que allotgem nosaltres mateixos a
          analytics.joeltaylor.business. no fa servir cookies ni cap
          identificador que et segueixi entre visites, i la teva adreça ip no es
          desa: només s&apos;utilitza de pas per deduir el país.
        </P>
        <P>
          les dades no van a parar a cap tercer —es queden al nostre servidor— i
          són agregades: quines pàgines es visiten, quines línies i parades
          s&apos;obren, i dades aproximades de navegador i país. no hi ha res
          que permeti identificar-te, i mai desem el text que escrius al
          cercador.
        </P>
        <P>
          pots desactivar-ho quan vulguis des del tauler de configuració, a
          l&apos;apartat &quot;privadesa i dades&quot;. si vols saber què recull
          exactament l&apos;eina: <External href="https://umami.is/docs/faq" />
        </P>
      </Section>

      <Section title="google maps">
        <P>
          el mapa d&apos;aquest lloc es mostra mitjançant l&apos;api de google
          maps. per carregar-lo, el teu navegador es connecta directament als
          servidors de google, que poden rebre la teva adreça ip i aplicar les
          seves pròpies polítiques d&apos;emmagatzematge. aquest ús és necessari
          perquè el mapa funcioni, i queda subjecte a la política de privadesa
          de google: <External href="https://policies.google.com/privacy" />
        </P>
      </Section>

      <Section title="la teva elecció sobre les parades preferides">
        <P>
          quan visites el lloc per primer cop, et preguntem si vols que desem
          les teves parades preferides en aquest dispositiu. si ho rebutges:
        </P>
        <List>
          <li>
            eliminem immediatament qualsevol parada preferida ja desada en
            aquest dispositiu.
          </li>
          <li>no es tornarà a desar res fins que ho tornis a acceptar.</li>
        </List>
        <P>
          pots canviar aquesta decisió en qualsevol moment des de l&apos;enllaç
          &quot;preferències de privadesa&quot;.
        </P>
      </Section>

      <Section title="els teus drets">
        <P>
          com que no guardem cap dada als nostres servidors, la manera més
          directa d&apos;exercir els teus drets d&apos;accés o supressió és
          esborrar les dades del lloc des de la configuració del teu navegador,
          o rebutjar l&apos;avís d&apos;aquest lloc. per a qualsevol altra
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
          si en el futur afegim funcionalitats que requereixin desar més
          informació (per exemple, un sistema d&apos;inici de sessió),
          actualitzarem aquest avís i, si cal, et tornarem a demanar el
          consentiment.
        </P>
      </Section>
    </ContentPage>
  );
};

export default PrivadesaPage;
