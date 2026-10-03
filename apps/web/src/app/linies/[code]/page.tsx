import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import type { LinePage } from "@moventis/api";
import { ContentPage } from "@/components/content/content-page";
import { LineBadge } from "@/components/content/line-badge";
import { Note } from "@/components/content/note";
import { RouteShape } from "@/components/content/route-shape";
import { FOCUS_RING } from "@/components/content/styles";
import { TimetableViewer } from "@/components/content/timetable-viewer";
import { LINE_ACCENT_CLASS, lineAccentStyle } from "@/lib/contrast";
import { pageMetadata } from "@/lib/seo";
import {
  DAY_TYPE_LABELS,
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
  params: Promise<{ code: string }>;
}

const loadLine = async (params: Props["params"]) => {
  const { code } = await params;
  const normalised = code.toLowerCase();
  // `/linies/N1` is someone typing the code as it is painted on the bus.
  if (normalised !== code) permanentRedirect(`/linies/${normalised}`);
  const line = await api.content.line({ code: normalised });
  if (!line) notFound();
  return line;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const line = await loadLine(params);
  const name = lineDisplayName(line.code, line.name);
  const weekday = line.summary.weekday;
  const when = weekday
    ? ` els dies feiners surt de ${formatServiceTime(weekday.first)} a ${formatServiceTime(weekday.last)}${weekday.headway ? `, cada ${weekday.headway} min` : ""}.`
    : "";
  return pageMetadata({
    title: `línia ${line.code} ${name}: horaris i parades`,
    description: `horaris de la línia ${line.code} (${name}) del bus urbà de lleida.${when} horari complet per dies i totes les parades del recorregut.`,
    path: `/linies/${line.code}`,
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

const LiniaPage = async ({ params }: Props) => {
  const line = await loadLine(params);
  const name = lineDisplayName(line.code, line.name);
  const dates = describeServiceDays(line.days);

  return (
    <ContentPage
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
