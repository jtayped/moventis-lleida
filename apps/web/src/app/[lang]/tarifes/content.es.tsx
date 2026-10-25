import { FareList } from "@/components/content/fare-list";
import { External, List, P, Section } from "@/components/content/prose";
import type { FaresCopy } from "@/i18n/copy/fares";

export const TarifesContent = ({ t }: { t: FaresCopy }) => (
  <>
    <div className="mt-6">
      <P>
        en los autobuses urbanos de lleida puedes pagar con un billete sencillo,
        con una de las tarjetas de la ciudad o con las tarjetas integradas de la
        atm del área de lleida, que también valen para los buses interurbanos y
        el tren. si viajas a menudo, una tarjeta sale más a cuenta que el
        billete.
      </P>
    </div>

    <Section title="tarifas de la ciudad" id="ciutat">
      <FareList fares={t.urbanFares} />
      <P>
        hacerse cualquiera de estas tarjetas cuesta {t.urbanCardCost}. fuente:{" "}
        <External href={t.urbanSource.href}>{t.urbanSource.label}</External>.
      </P>
    </Section>

    <Section title="tarjetas integradas de la atm" id="atm">
      <P>
        precios bonificados de una zona, vigentes {t.atmValidity}. un viaje
        dentro de lleida es de una zona. con estas tarjetas, los transbordos son
        gratuitos durante {t.atmTransferWindow} desde la primera validación.
      </P>
      <FareList fares={t.atmFares} />
      <P>
        la tarjeta anónima cuesta {t.atmCardCosts.anonymous} y la personalizada{" "}
        {t.atmCardCosts.personalised}. hay descuentos para familias numerosas y
        monoparentales y para personas en paro. fuente y precios de 2, 3 y 4
        zonas: <External href={t.atmSource.href}>{t.atmSource.label}</External>.
      </P>
    </Section>

    <Section title="dónde se compran y se recargan" id="on-comprar">
      <List>
        <li>el billete sencillo se compra en el propio bus.</li>
        <li>
          las tarjetas de la atm se hacen y se recargan en la oficina principal
          de atención al cliente, en la plaça d&apos;espanya, 1 (entrada por
          l&apos;avinguda de madrid), de lunes a viernes de 8.00 a 19.45, en la
          oficina de la estación de autobuses y en muchos estancos y tiendas de
          la ciudad:{" "}
          <External href="https://atmlleida.cat/xarxa-de-venda-i-recarrega/">
            lista de puntos de venta
          </External>
          .
        </li>
        <li>
          teléfono de información de la atm lleida:{" "}
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

    <Section title="antes de pagar" id="avis">
      <P>
        esta página recoge los precios publicados por moventis y por la atm
        lleida el {t.reviewedOn}. si un precio no te cuadra, manda el de la
        fuente oficial.
      </P>
    </Section>
  </>
);
