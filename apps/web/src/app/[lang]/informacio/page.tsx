import type { Lang } from "@moventis/shared";
import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { ContentPage } from "@/components/content/content-page";
import { FOCUS_RING } from "@/components/content/styles";
import { LineBadge } from "@/components/content/line-badge";
import { contentCopy } from "@/i18n/copy/content";
import { infoCopy } from "@/i18n/copy/info";
import { compareByLineCode } from "@/lib/lines";
import { cn } from "@/lib/utils";
import { asLang, type LangParams } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import { DAY_TYPE_ORDER, formatServiceTime } from "@/lib/service-time";
import { api } from "@/trpc/server";
import { InformacioContent as ca } from "./content.ca";
import { InformacioContent as es } from "./content.es";

// The last-bus table comes from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = asLang((await params).lang);
  const t = infoCopy[lang];
  return pageMetadata({
    title: t.metaTitle,
    description: t.description,
    path: "/informacio",
    lang,
  });
}

type LineIndex = Awaited<ReturnType<typeof api.content.lines>>;

/**
 * The lines with a stored timetable for any of the days shown, in line order.
 * The n1 runs one night a week and often has none in the window; listing it
 * as "no circula" every day would say it does not exist.
 */
const timetabled = (index: LineIndex) =>
  [...index.lines]
    .sort(compareByLineCode)
    .filter((line) => Object.keys(line.summary).length > 0);

/**
 * The last departure of every line, per day type, as a table: the answer to
 * "a quina hora passa l'últim bus", which is what this page gets searched for.
 */
const LastBusTable = ({ index, lang }: { index: LineIndex; lang: Lang }) => {
  const t = infoCopy[lang].lastBusTable;
  const types = DAY_TYPE_ORDER.filter((type) => index.days[type]);
  const lines = timetabled(index);
  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-left">
          <tr>
            <th scope="col" className="p-3 font-medium">
              {t.line}
            </th>
            {types.map((type) => (
              <th key={type} scope="col" className="p-3 font-medium">
                {contentCopy[lang].dayTypeLabels[type]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {lines.map((line) => (
            <tr key={line.code}>
              <th scope="row" className="p-2 text-left font-normal">
                <Link
                  href={`/linies/${line.code}`}
                  className={cn("inline-flex rounded-md", FOCUS_RING)}
                >
                  <LineBadge
                    code={line.code}
                    color={line.color}
                    className="size-8 text-xs"
                  />
                  <span className="sr-only">{t.lineSr(line.code)}</span>
                </Link>
              </th>
              {types.map((type) => {
                const day = line.summary[type];
                return (
                  <td
                    key={type}
                    className={cn(
                      "p-3 tabular-nums",
                      !day && "text-muted-foreground",
                    )}
                  >
                    {day ? formatServiceTime(day.last) : t.notRunning}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const noSundayClause = (index: LineIndex, lang: Lang) => {
  const t = infoCopy[lang];
  const codes = timetabled(index)
    .filter((line) => !line.summary.sunday)
    .map((line) => t.lineRef(line.code));
  return t.noSundayClause(codes.length, contentCopy[lang].joinList(codes));
};

const CONTENT = { ca, es };

const InformacioPage = async ({ params }: LangParams) => {
  const lang = asLang((await params).lang);
  const index = await api.content.lines();
  const t = infoCopy[lang];
  const Content = CONTENT[lang];
  const noSunday = index.days.sunday ? noSundayClause(index, lang) : "";
  return (
    <ContentPage
      lang={lang}
      credit={false}
      title={t.title}
      updated={t.updated(t.reviewedOn)}
    >
      <Content
        noSunday={noSunday}
        lastBus={
          index.lines.length > 0 ? (
            <LastBusTable index={index} lang={lang} />
          ) : null
        }
      />
    </ContentPage>
  );
};

export default InformacioPage;
