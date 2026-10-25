import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { ContentPage } from "@/components/content/content-page";
import { LineBadge } from "@/components/content/line-badge";
import { Note } from "@/components/content/note";
import { RouteShape } from "@/components/content/route-shape";
import { ServiceSpan } from "@/components/content/service-span";
import { LINE_ACCENT_CLASS, lineAccentStyle } from "@/lib/contrast";
import { compareByLineCode } from "@/lib/lines";
import { linesCopy } from "@/i18n/copy/lines";
import { asLang, type LangParams } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { describeServiceDays, lineDisplayName } from "@/lib/service-time";
import { api } from "@/trpc/server";

// Lines and timetables come from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const lang = asLang((await params).lang);
  const t = linesCopy[lang].index;
  return pageMetadata({
    title: t.title,
    description: t.description,
    path: "/linies",
    lang,
  });
}

const LiniesPage = async ({ params }: LangParams) => {
  const lang = asLang((await params).lang);
  const t = linesCopy[lang].index;
  const { days, lines } = await api.content.lines();
  const sorted = [...lines].sort(compareByLineCode);
  const dates = describeServiceDays(days, lang);

  return (
    <ContentPage lang={lang} section="/linies" title={t.title} wide>
      <p className="text-muted-foreground mt-3 text-base">
        {t.intro(sorted.length)}
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {sorted.map((line) => {
          const headway = line.summary.weekday?.headway;
          return (
            <li key={line.code}>
              {/* One link per card, on the title, stretched over the card with
                  `after:`. A card-wide <a> made every line's link name its
                  whole card: "1 interior cada 11 min els feiners feiners
                  06:54–21:49 dissabtes ...", fourteen times over. */}
              <article
                style={lineAccentStyle(line.color)}
                className={cn(
                  "border-border hover:bg-muted/40 relative flex h-full flex-col gap-4 rounded-xl border p-4 transition-colors",
                  "has-[a:focus-visible]:outline-ring has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2",
                  LINE_ACCENT_CLASS,
                )}
              >
                <div className="flex items-start gap-3">
                  <LineBadge code={line.code} color={line.color} decorative />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base leading-snug font-semibold">
                      <Link
                        href={`/linies/${line.code}`}
                        className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
                      >
                        <span className="sr-only">{t.lineSr(line.code)}</span>
                        {lineDisplayName(line.code, line.name)}
                      </Link>
                    </h2>
                    {headway && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {t.headway(headway)}
                      </p>
                    )}
                  </div>
                  <RouteShape
                    path={line.path}
                    width={96}
                    maxHeight={48}
                    strokeWidth={2.5}
                    className="w-16 shrink-0"
                  />
                </div>
                <ServiceSpan summary={line.summary} days={days} />
              </article>
            </li>
          );
        })}
      </ul>

      {dates && <Note title={t.noteTitle}>{t.note(dates)}</Note>}
    </ContentPage>
  );
};

export default LiniesPage;
