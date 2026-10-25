import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import type { DaySummary, LinePage } from "@moventis/api";
import type { Lang } from "@moventis/shared";
import { ContentPage } from "@/components/content/content-page";
import { LineBadge } from "@/components/content/line-badge";
import { Note } from "@/components/content/note";
import { RouteShape } from "@/components/content/route-shape";
import { FOCUS_RING } from "@/components/content/styles";
import { TimetableViewer } from "@/components/content/timetable-viewer";
import { LINE_ACCENT_CLASS, lineAccentStyle } from "@/lib/contrast";
import { localePath } from "@moventis/shared";
import { contentCopy } from "@/i18n/copy/content";
import { linesCopy } from "@/i18n/copy/lines";
import { asLang } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import {
  DAY_TYPE_ORDER,
  describeServiceDays,
  formatServiceTime,
  lineDisplayName,
  todayDayType,
} from "@/lib/service-time";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/server";

// Timetables come from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ lang: string; code: string }>;
}

const loadLine = async (params: Props["params"]) => {
  const { code, lang: segment } = await params;
  const lang = asLang(segment);
  const normalised = code.toLowerCase();
  // `/linies/N1` is someone typing the code as it is painted on the bus.
  if (normalised !== code) {
    permanentRedirect(localePath(lang, `/linies/${normalised}`));
  }
  const line = await api.content.line({ code: normalised });
  if (!line) notFound();
  return { line, lang };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line, lang } = await loadLine(params);
  const t = linesCopy[lang].page;
  const name = lineDisplayName(line.code, line.name);
  const weekday = line.summary.weekday;
  const when = weekday
    ? t.metaWhen(
        formatServiceTime(weekday.first),
        formatServiceTime(weekday.last),
        weekday.headway,
      )
    : "";
  return pageMetadata({
    title: t.metaTitle(line.code, name),
    description: t.metaDescription(line.code, name, when),
    path: `/linies/${line.code}`,
    lang,
  });
}

/** First bus, last bus and frequency, one card per day type. */
const DayCards = ({ line, lang }: { line: LinePage; lang: Lang }) => {
  const c = contentCopy[lang];
  const t = linesCopy[lang].page;
  return (
    <ul className="grid grid-cols-3 gap-2">
      {DAY_TYPE_ORDER.filter((type) => line.days[type]).map((type) => {
        const day = line.summary[type];
        return (
          <li
            key={type}
            className={
              day
                ? "bg-muted/60 rounded-xl p-3"
                : "border-border rounded-xl border border-dashed p-3"
            }
          >
            <p className="text-muted-foreground text-sm">
              {c.dayTypeLabels[type]}
            </p>
            {day ? (
              <>
                <p className="mt-1 text-lg leading-tight font-semibold tabular-nums">
                  {formatServiceTime(day.first)}
                  <span className="sr-only">{t.untilSr}</span>
                  <span
                    aria-hidden
                    className="text-muted-foreground font-normal"
                  >
                    {" – "}
                  </span>
                  <br className="sm:hidden" />
                  {formatServiceTime(day.last)}
                </p>
                {day.headway && (
                  <p className="mt-2 flex items-center gap-1 text-sm">
                    <Clock
                      size={14}
                      aria-hidden
                      className="hidden shrink-0 sm:block"
                    />
                    {t.headway(day.headway)}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm font-medium">{t.notRunning}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/**
 * One phrase per day type the timetable covers, e.g. "els dies feiners a les
 * 07:00 i els diumenges no circula". `pick` returns null for a day the line
 * runs but the fact does not apply to (a frequency it has no single value for);
 * `idle: false` leaves out the days it does not run at all.
 */
const perDay = (
  lang: Lang,
  line: LinePage,
  pick: (day: DaySummary) => string | null,
  { idle = true }: { idle?: boolean } = {},
): string => {
  const c = contentCopy[lang];
  const t = linesCopy[lang].faq;
  return c.joinList(
    DAY_TYPE_ORDER.filter((type) => line.days[type]).flatMap((type) => {
      const day = line.summary[type];
      const phrase = c.dayTypePhrases[type];
      if (!day) return idle ? [t.idle(phrase)] : [];
      const fact = pick(day);
      return fact ? [t.onDay(phrase, fact)] : [];
    }),
  );
};

/**
 * The questions people type into a search box about a line, answered from the
 * timetable. Phrased the way they are searched ("bus 20"), because that is
 * what the page has to match.
 */
const LineFaq = ({ line, lang }: { line: LinePage; lang: Lang }) => {
  const t = linesCopy[lang].faq;
  const bus = t.bus(line.code);
  const principal =
    line.segments.find((s) => s.isPrincipal) ?? line.segments[0];
  const from = principal?.stops[0]?.name;
  const to = principal?.stops[principal.stops.length - 1]?.name;
  const stopCount = new Set(
    line.segments.flatMap((s) => s.stops.map((stop) => stop.externalId)),
  ).size;
  const sunday = line.summary.sunday;

  const faqs = [
    {
      q: t.firstQ(line.code),
      a: perDay(lang, line, (day) => t.atTime(formatServiceTime(day.first))),
    },
    {
      q: t.lastQ(line.code),
      a: perDay(lang, line, (day) => t.atTime(formatServiceTime(day.last))),
    },
    {
      q: t.headwayQ(bus),
      // The two answers above already say which days it does not run.
      a: perDay(
        lang,
        line,
        (day) => (day.headway ? t.every(day.headway) : null),
        { idle: false },
      ),
    },
    line.days.sunday && {
      q: t.sundayQ(bus),
      a: sunday
        ? t.sundayYes(
            formatServiceTime(sunday.first),
            formatServiceTime(sunday.last),
          )
        : t.sundayNo,
    },
    stopCount > 0 && {
      q: t.stopsQ(bus),
      a:
        from && to && from !== to
          ? t.stopsBetween(stopCount, from, to)
          : from
            ? t.stopsLoop(stopCount, from)
            : t.stopsOnly(stopCount),
    },
  ].filter((faq): faq is { q: string; a: string } => !!faq && !!faq.a);

  if (faqs.length === 0) return null;
  return (
    <section id="preguntes" className="mt-12 scroll-mt-6 space-y-4">
      <h2 className="text-xl font-semibold">{t.heading}</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {faqs.map(({ q, a }) => (
          <li key={q} className="bg-muted/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold">{q}</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {/* The phrases end without a full stop; the sentence needs one. */}
              {a.endsWith(".") ? a : `${a}.`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

const LiniaPage = async ({ params }: Props) => {
  const { line, lang } = await loadLine(params);
  const t = linesCopy[lang].page;
  const name = lineDisplayName(line.code, line.name);
  const dates = describeServiceDays(line.days, lang);

  return (
    <ContentPage
      lang={lang}
      section="/linies"
      title={t.title(line.code, name)}
      leading={<LineBadge code={line.code} color={line.color} decorative />}
      breadcrumbs={[{ label: t.breadcrumb, href: "/linies" }]}
    >
      <div style={lineAccentStyle(line.color)} className={LINE_ACCENT_CLASS}>
        <p className="text-muted-foreground mt-3 text-base">
          {t.intro(line.code)}
        </p>

        <div className="mt-6 space-y-3">
          <DayCards line={line} lang={lang} />

          <div className="border-border overflow-hidden rounded-xl border">
            <div className="bg-muted/40 p-3">
              <RouteShape path={line.path} label={t.routeLabel(line.code)} />
            </div>
            <Link
              href={`/?lines=${encodeURIComponent(line.code)}`}
              className={cn(
                "hover:bg-muted/50 border-border flex min-h-12 items-center gap-2 border-t px-4 py-3 text-sm font-medium transition-colors",
                FOCUS_RING,
              )}
            >
              <MapPin size={16} aria-hidden className="shrink-0" />
              {t.openMap}
            </Link>
          </div>
        </div>

        <section id="horaris" className="mt-12 scroll-mt-6 space-y-5">
          <h2 className="text-xl font-semibold">{t.timetables}</h2>
          {line.segments.length === 0 ? (
            <p className="text-muted-foreground text-base">{t.noTimetable}</p>
          ) : (
            <TimetableViewer
              segments={line.segments}
              days={line.days}
              initialDay={todayDayType()}
            />
          )}
        </section>

        <LineFaq line={line} lang={lang} />

        {dates && (
          <Note title={t.noteTitle}>
            <p>{t.noteDates(dates)}</p>
            <p>{t.noteHolidays}</p>
          </Note>
        )}
      </div>
    </ContentPage>
  );
};

export default LiniaPage;
