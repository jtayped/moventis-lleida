import type { Metadata } from "next";
import { ContentPage } from "@/components/content/content-page";
import { privacyCopy } from "@/i18n/copy/privacy";
import { asLang, langStaticParams, type LangParams } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import { PrivadesaContent as ca } from "./content.ca";
import { PrivadesaContent as es } from "./content.es";

export const generateStaticParams = langStaticParams;

const CONTENT = { ca, es };

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = asLang((await params).lang);
  const t = privacyCopy[lang];
  return pageMetadata({
    title: t.title,
    description: t.description,
    path: "/privadesa",
    lang,
  });
}

const PrivadesaPage = async ({ params }: LangParams) => {
  const lang = asLang((await params).lang);
  const t = privacyCopy[lang];
  const Content = CONTENT[lang];
  return (
    <ContentPage lang={lang} title={t.title} updated={t.updated}>
      <Content />
    </ContentPage>
  );
};

export default PrivadesaPage;
