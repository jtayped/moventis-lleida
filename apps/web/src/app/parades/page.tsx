import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";
import { StopFinder } from "@/components/content/stop-finder";
import { pageMetadata } from "@/lib/seo";
import { api } from "@/trpc/server";

// Stops come from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "parades del bus urbà de lleida",
  description:
    "totes les parades del bus urbà de lleida, de la a a la z, amb les línies que hi paren. entra a una parada per veure'n els horaris.",
  path: "/parades",
});

const ParadesPage = async () => {
  const [stops, routes] = await Promise.all([
    api.content.stops(),
    api.routes.getAll(),
  ]);
  const colors = Object.fromEntries(routes.map((r) => [r.code, r.color]));

  return (
    <ContentPage section="/parades" title="parades del bus urbà de lleida" wide>
      <p className="text-muted-foreground mt-3 text-base">
        busca la teva parada per veure&apos;n els horaris i les línies.
      </p>
      <div className="mt-6">
        <StopFinder stops={stops} colors={colors} />
      </div>
    </ContentPage>
  );
};

export default ParadesPage;
