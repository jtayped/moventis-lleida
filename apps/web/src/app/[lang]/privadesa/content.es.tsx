import { External, List, P, Section } from "@/components/content/prose";

export const PrivadesaContent = () => (
  <>
    <Section title="quién es responsable de este sitio">
      <P>
        este sitio web es un proyecto personal de joel taylor pedrós. para
        cualquier consulta sobre privacidad, puedes escribir a{" "}
        <a
          href="mailto:jtayped@gmail.com"
          className="text-foreground underline underline-offset-4"
        >
          jtayped@gmail.com
        </a>
        .
      </P>
    </Section>

    <Section title="qué datos se guardan en tu dispositivo">
      <P>
        este sitio no requiere ninguna cuenta ni recoge datos personales en
        nuestros servidores. la única información que se guarda está en tu
        propio navegador (almacenamiento local), e incluye:
      </P>
      <List>
        <li>
          los identificadores de las paradas que marques como
          &quot;favoritas&quot;, para que puedas encontrarlas en futuras visitas
          desde este mismo dispositivo.
        </li>
        <li>
          tu decisión sobre el aviso de almacenamiento local (si lo has aceptado
          o rechazado).
        </li>
        <li>
          tus preferencias de los ajustes, entre ellas si has desactivado la
          analítica anónima: la señal que la apaga se guarda en este
          dispositivo, y es lo que hace que no se envíe nada.
        </li>
      </List>
      <P>
        estos datos no salen nunca de tu dispositivo: no hay ningún servidor que
        los reciba ni los almacene.
      </P>
    </Section>

    <Section title="cookies y seguimiento">
      <P>
        no usamos cookies de seguimiento ni publicidad. contamos visitas de
        forma anónima con una herramienta propia, y puedes desactivarlo en los
        ajustes.
      </P>
    </Section>

    <Section title="analítica (umami)">
      <P>
        para saber si el sitio se usa y qué se consulta en él, usamos umami, que
        alojamos nosotros mismos en analytics.joeltaylor.business. no usa
        cookies ni ningún identificador que te siga entre visitas, y tu
        dirección ip no se guarda: solo se usa de paso para deducir el país.
      </P>
      <P>
        los datos no acaban en manos de terceros (se quedan en nuestro servidor)
        y son agregados: qué páginas se visitan, qué líneas y paradas se abren,
        y datos aproximados de navegador y país. no hay nada que permita
        identificarte, y nunca guardamos el texto que escribes en el buscador.
      </P>
      <P>
        puedes desactivarlo cuando quieras desde el panel de ajustes, en el
        apartado &quot;privacidad y datos&quot;. si quieres saber qué recoge
        exactamente la herramienta:{" "}
        <External href="https://umami.is/docs/faq" />
      </P>
    </Section>

    <Section title="google maps">
      <P>
        el mapa de este sitio se muestra mediante la api de google maps. para
        cargarlo, tu navegador se conecta directamente a los servidores de
        google, que pueden recibir tu dirección ip y aplicar sus propias
        políticas de almacenamiento. este uso es necesario para que el mapa
        funcione, y queda sujeto a la política de privacidad de google:{" "}
        <External href="https://policies.google.com/privacy" />
      </P>
    </Section>

    <Section title="tu elección sobre las paradas favoritas">
      <P>
        la primera vez que visitas el sitio, te preguntamos si quieres que
        guardemos tus paradas favoritas en este dispositivo. si lo rechazas:
      </P>
      <List>
        <li>
          borramos al momento cualquier parada favorita ya guardada en este
          dispositivo.
        </li>
        <li>no se volverá a guardar nada hasta que lo vuelvas a aceptar.</li>
      </List>
      <P>
        puedes cambiar esta decisión en cualquier momento desde el enlace
        &quot;preferencias de privacidad&quot;.
      </P>
    </Section>

    <Section title="tus derechos">
      <P>
        como no guardamos ningún dato en nuestros servidores, la forma más
        directa de ejercer tus derechos de acceso o supresión es borrar los
        datos del sitio desde los ajustes de tu navegador, o rechazar el aviso
        de este sitio. para cualquier otra consulta, escríbenos a{" "}
        <a
          href="mailto:jtayped@gmail.com"
          className="text-foreground underline underline-offset-4"
        >
          jtayped@gmail.com
        </a>
        .
      </P>
    </Section>

    <Section title="cambios futuros">
      <P>
        si en el futuro añadimos funciones que requieran guardar más información
        (por ejemplo, un sistema de inicio de sesión), actualizaremos este aviso
        y, si hace falta, te volveremos a pedir el consentimiento.
      </P>
    </Section>
  </>
);
