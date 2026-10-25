import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import type { DaySummary, LinePage } from "@moventis/api";
import { ContentPage } from "@/components/content/content-page";
import { LineBadge } from "@/components/content/line-badge";
import { Note } from "@/components/content/note";
import { RouteShape } from "@/components/content/route-shape";
import { FOCUS_RING } from "@/components/content/styles";
import { TimetableViewer } from "@/components/content/timetable-viewer";
import { LINE_ACCENT_CLASS, lineAccentStyle } from "@/lib/contrast";
import { localePath } from "@moventis/shared";
import { asLang } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import {
  DAY_TYPE_LABELS,
  DAY_TYPE_ORDER,
  DAY_TYPE_PHRASES,
  describeServiceDays,
  formatServiceTime,
  joinCatalan,
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
  const name = lineDisplayName(line.code, line.name);
  const weekday = line.summary.weekday;
  const when = weekday
    ? ` els dies feiners surt de ${formatServiceTime(weekday.first)} a ${formatServiceTime(weekday.last)}${weekday.headway ? `, cada ${weekday.headway} min` : ""}.`
    : "";
  return pageMetadata({
    // "bus 20 lleida" is how people search for a line, not "línia 20".
    title: `bus ${line.code} lleida (${name}): horaris, recorregut i parades`,
    description: `horaris de la línia ${line.code} (${name}) del bus urbà de lleida.${when} horari complet per dies i totes les parades del recorregut.`,
    path: `/linies/${line.code}`,
    lang,
  });
}

/** First bus, last bus and frequency, one card per day type. */
const DayCards = ({ line }: { line: LinePage }) => (
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
            {DAY_TYPE_LABELS[type]}
          </p>
          {day ? (
            <>
              <p className="mt-1 text-lg leading-tight font-semibold tabular-nums">
                {formatServiceTime(day.first)}
                <span className="sr-only"> fins a les </span>
                <span aria-hidden className="text-muted-foreground font-normal">
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
                  cada {day.headway} min
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm font-medium">no circula</p>
          )}
        </li>
      );
    })}
  </ul>
);

/**
 * One phrase per day type the timetable covers, e.g. "els dies feiners a les
 * 07:00 i els diumenges no circula". `pick` returns null for a day the line
 * runs but the fact does not apply to (a frequency it has no single value for);
 * `idle: false` leaves out the days it does not run at all.
 */
const perDay = (
  line: LinePage,
  pick: (day: DaySummary) => string | null,
  { idle = true }: { idle?: boolean } = {},
): string =>
  joinCatalan(
    DAY_TYPE_ORDER.filter((type) => line.days[type]).flatMap((type) => {
      const day = line.summary[type];
      if (!day) return idle ? [`${DAY_TYPE_PHRASES[type]} no circula`] : [];
      const fact = pick(day);
      return fact ? [`${DAY_TYPE_PHRASES[type]} ${fact}`] : [];
    }),
  );

/**
 * The questions people type into a search box about a line, answered from the
 * timetable. Phrased the way they are searched ("bus 20"), because that is
 * what the page has to match.
 */
const LineFaq = ({ line }: { line: LinePage }) => {
  const bus = `el bus ${line.code}`;
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
      q: `a quina hora passa el primer bus ${line.code}?`,
      a: perDay(line, (day) => `a les ${formatServiceTime(day.first)}`),
    },
    {
      q: `a quina hora passa l'últim bus ${line.code}?`,
      a: perDay(line, (day) => `a les ${formatServiceTime(day.last)}`),
    },
    {
      q: `cada quant passa ${bus}?`,
      // The two answers above already say which days it does not run.
      a: perDay(
        line,
        (day) => (day.headway ? `cada ${day.headway} min` : null),
        { idle: false },
      ),
    },
    line.days.sunday && {
      q: `${bus} circula els diumenges i festius?`,
      a: sunday
        ? `sí, de ${formatServiceTime(sunday.first)} a ${formatServiceTime(sunday.last)}.`
        : "no, els diumenges i festius no circula.",
    },
    stopCount > 0 && {
      q: `per quines parades passa ${bus}?`,
      a:
        from && to && from !== to
          ? `per ${stopCount} parades, de ${from} a ${to}.`
          : from
            ? `per ${stopCount} parades, en un recorregut circular des de ${from}.`
            : `per ${stopCount} parades.`,
    },
  ].filter((faq): faq is { q: string; a: string } => !!faq && !!faq.a);

  if (faqs.length === 0) return null;
  return (
    <section id="preguntes" className="mt-12 scroll-mt-6 space-y-4">
      <h2 className="text-xl font-semibold">preguntes freqüents</h2>
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
  const name = lineDisplayName(line.code, line.name);
  const dates = describeServiceDays(line.days);

  return (
    <ContentPage
      lang={lang}
      section="/linies"
      title={`línia ${line.code}: ${name}`}
      leading={<LineBadge code={line.code} color={line.color} decorative />}
      breadcrumbs={[{ label: "línies", href: "/linies" }]}
    >
      <div style={lineAccentStyle(line.color)} className={LINE_ACCENT_CLASS}>
        <p className="text-muted-foreground mt-3 text-base">
          horaris i parades de la línia {line.code} del bus urbà de lleida.
        </p>

        <div className="mt-6 space-y-3">
          <DayCards line={line} />

          <div className="border-border overflow-hidden rounded-xl border">
            <div className="bg-muted/40 p-3">
              <RouteShape
                path={line.path}
                label={`recorregut de la línia ${line.code} sobre lleida`}
              />
            </div>
            <Link
              href={`/?lines=${encodeURIComponent(line.code)}`}
              className={cn(
                "hover:bg-muted/50 border-border flex min-h-12 items-center gap-2 border-t px-4 py-3 text-sm font-medium transition-colors",
                FOCUS_RING,
              )}
            >
              <MapPin size={16} aria-hidden className="shrink-0" />
              on són ara els busos? obre-la al mapa en directe
            </Link>
          </div>
        </div>

        <section id="horaris" className="mt-12 scroll-mt-6 space-y-5">
          <h2 className="text-xl font-semibold">horaris</h2>
          {line.segments.length === 0 ? (
            <p className="text-muted-foreground text-base">
              ara mateix no tenim l&apos;horari d&apos;aquesta línia. al mapa en
              directe pots veure quan passa per cada parada.
            </p>
          ) : (
            <TimetableViewer
              segments={line.segments}
              days={line.days}
              initialDay={todayDayType()}
            />
          )}
        </section>

        <LineFaq line={line} />

        {dates && (
          <Note title="d'on surten aquestes hores">
            <p>
              de l&apos;horari programat de moventis, per a un dia concret de
              cada tipus: {dates}. són les sortides de la primera parada; a la
              resta, el bus hi passa més tard.
            </p>
            <p>
              els festius i els canvis de temporada poden tenir un horari
              diferent. per saber quan arriba de debò, mira el mapa en directe.
            </p>
          </Note>
        )}
      </div>
    </ContentPage>
  );
};

export default LiniaPage;
