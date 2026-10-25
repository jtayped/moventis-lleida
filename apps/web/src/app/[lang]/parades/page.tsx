import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";
import { StopFinder } from "@/components/content/stop-finder";
import { stopsCopy } from "@/i18n/copy/stops";
import { asLang, type LangParams } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import { api } from "@/trpc/server";

// Stops come from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = asLang((await params).lang);
  const t = stopsCopy[lang].index;
  return pageMetadata({
    title: t.title,
    description: t.description,
    path: "/parades",
    lang,
  });
}

const ParadesPage = async ({ params }: LangParams) => {
  const lang = asLang((await params).lang);
  const t = stopsCopy[lang].index;
  const [stops, routes] = await Promise.all([
    api.content.stops(),
    api.routes.getAll(),
  ]);
  const colors = Object.fromEntries(routes.map((r) => [r.code, r.color]));

  return (
    <ContentPage lang={lang} section="/parades" title={t.title} wide>
      <p className="text-muted-foreground mt-3 text-base">{t.intro}</p>
      <div className="mt-6">
        <StopFinder stops={stops} colors={colors} />
      </div>
    </ContentPage>
  );
};

export default ParadesPage;
