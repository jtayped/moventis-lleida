import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";
import { faresCopy } from "@/i18n/copy/fares";
import { asLang, langStaticParams, type LangParams } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import { TarifesContent as ca } from "./content.ca";
import { TarifesContent as es } from "./content.es";

export const generateStaticParams = langStaticParams;

const CONTENT = { ca, es };

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = asLang((await params).lang);
  const t = faresCopy[lang];
  return pageMetadata({
    title: t.metaTitle,
    description: t.description,
    path: "/tarifes",
    lang,
  });
}

const TarifesPage = async ({ params }: LangParams) => {
  const lang = asLang((await params).lang);
  const t = faresCopy[lang];
  const Content = CONTENT[lang];
  return (
    <ContentPage lang={lang} title={t.title} updated={t.updated(t.reviewedOn)}>
      <Content t={t} />
    </ContentPage>
  );
};

export default TarifesPage;
