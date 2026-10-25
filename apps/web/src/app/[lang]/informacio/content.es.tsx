import { Heart, Mail, RefreshCw, Shield } from "lucide-react";
import React from "react";
import { AuthorCard } from "@/components/content/author-card";
import {
  External,
  InternalLink,
  List,
  P,
  Section,
} from "@/components/content/prose";
import { FOCUS_RING } from "@/components/content/styles";
import { cn } from "@/lib/utils";

export const InformacioContent = ({
  noSunday,
  lastBus,
}: {
  /** `infoCopy.noSundayClause`, or "" when every line runs on sundays. */
  noSunday: string;
  /** The last-bus table, or null when there are no lines to list. */
  lastBus: React.ReactNode;
}) => (
  <>
    <div className="mt-6">
      <P>
        esta web muestra los autobuses urbanos de lleida sobre un mapa, con las
        próximas llegadas a cada parada. usa los mismos datos públicos que la
        web de moventis, pero no es oficial. aquí verás cómo funciona la red y a
        quién dirigirte para todo lo que la web no resuelve.
      </P>
    </div>

    <Section title="quién lleva los buses" id="operador">
      <P>
        los autobuses urbanos de lleida los opera autobusos de lleida, una
        empresa del grupo moventis. las líneas interurbanas que salen de lleida
        hacia l&apos;albagés, el cogul, torres de segre y alcarràs son de
        sarbus, también de moventis, y no aparecen en esta web.
      </P>
    </Section>

    <Section title="las líneas" id="linies">
      <P>
        algunas líneas hacen un recorrido circular, como la 1 (interior) o la 20
        (ronda). las demás van y vuelven por el mismo camino, con paradas a
        ambos lados de la calle. puedes verlas todas, con su recorrido y sus
        paradas, en el <InternalLink href="/">mapa</InternalLink>.
      </P>
    </Section>

    <Section title="¿a qué hora pasa el último bus?" id="ultim-bus">
      <P>
        la mayoría de líneas hacen el último viaje hacia las 10 o las 11 de la
        noche. es la hora de salida de la primera parada; por las demás, el bus
        pasa más tarde.
      </P>
      {lastBus}
    </Section>

    <Section title="¿hay buses los domingos y festivos?" id="diumenges">
      <P>
        sí, pero pasan menos buses que los días laborables
        {noSunday}. los festivos suelen tener el horario de los domingos.
      </P>
      <P>
        la línea n1 es el bus nocturno. hace el recorrido magraners - secà -
        balàfia entre las 22.50 y las 6.00, la noche del sábado al domingo.
      </P>
    </Section>

    <Section title="cómo funciona el tiempo real" id="temps-real">
      <P>
        moventis publica, para cada parada, los próximos buses de cada línea.
        cuando el bus ya ha salido, la hora es una estimación que se actualiza
        mientras avanza. cuando aún no ha salido, es la hora del horario
        oficial. en la ficha de cada parada se distinguen las dos, y las horas
        se refrescan cada 30 segundos.
      </P>
      <P>
        las paradas también tienen un código qr que lleva al tiempo de llegada
        oficial.
      </P>
    </Section>

    <Section title="accesibilidad" id="accessibilitat">
      <P>
        según moventis, todas las líneas urbanas tienen vehículos adaptados para
        personas con movilidad reducida.
      </P>
    </Section>

    <Section title="tarifas" id="tarifes">
      <P>
        un viaje con billete sencillo cuesta 1,20 €, y las tarjetas de la ciudad
        y de la atm salen más a cuenta si viajas a menudo. todos los precios,
        con sus fuentes, están en{" "}
        <InternalLink href="/tarifes">tarifas</InternalLink>.
      </P>
    </Section>

    <Section title="contacto, incidencias y objetos perdidos" id="contacte">
      <List>
        <li>
          atención al viajero de moventis:{" "}
          <External href="https://www.moventis.es/ca/benvingut-atencio-al-viatger">
            moventis.es
          </External>
          .
        </li>
        <li>
          incidencias del servicio publicadas por moventis:{" "}
          <External href="https://www.moventis.es/ca/informacio-practica/incidencies">
            incidencias
          </External>
          .
        </li>
        <li>
          objetos perdidos en el bus:{" "}
          <External href="https://www.moventis.es/es/informacion-practica/objetos-perdidos">
            formulario de moventis
          </External>
          , eligiendo autobusos de lleida como compañía.
        </li>
        <li>
          tarjetas de la atm: teléfono 900 10 68 48, o{" "}
          <External href="https://atmlleida.cat/">atmlleida.cat</External>.
        </li>
        <li>
          información municipal sobre el bus:{" "}
          <External href="https://www.paeria.cat/ca/serveis/mobilitat/mobilitat/lleida-en-bus/en-transport-public">
            la paeria
          </External>
          .
        </li>
      </List>
    </Section>

    <Section title="sobre esta web" id="sobre">
      <AuthorCard />
      <ul className="text-muted-foreground space-y-3 text-sm leading-relaxed">
        <li className="flex items-start gap-3">
          <Heart size={16} aria-hidden className="mt-0.5 shrink-0" />
          proyecto personal, sin publicidad y sin relación con moventis,
          autobusos de lleida ni la paeria.
        </li>
        <li className="flex items-start gap-3">
          <RefreshCw size={16} aria-hidden className="mt-0.5 shrink-0" />
          las líneas y las paradas se actualizan cada noche desde moventis.es;
          las llegadas, en directo cuando abres una parada.
        </li>
        <li className="flex items-start gap-3">
          <Mail size={16} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            ¿has visto un error? escribe a{" "}
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
            qué se guarda en tu navegador, y qué no:{" "}
            <InternalLink href="/privadesa">privacidad</InternalLink>
          </span>
        </li>
      </ul>
    </Section>
  </>
);
