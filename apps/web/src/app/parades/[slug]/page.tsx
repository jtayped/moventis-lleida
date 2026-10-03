import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MapPin, Radio } from "lucide-react";
import { ContentPage } from "@/components/content/content-page";
import { LineBadge } from "@/components/content/line-badge";
import { Note } from "@/components/content/note";
import { StopTimetable } from "@/components/content/stop-timetable";
import { FOCUS_RING } from "@/components/content/styles";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/constants/metadata";
import { compareByLineCode, compareLineCodes } from "@/lib/lines";
import { pageMetadata } from "@/lib/seo";
import {
  describeServiceDays,
  joinCatalan,
  todayDayType,
} from "@/lib/service-time";
import { stopPath } from "@/lib/stops";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/server";

// Stops and timetables come from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * The stop behind `/parades/10242-placa-espanya-saracibar`. Only the leading id
 * is read; a URL with an old or missing name redirects to the current one.
 */
const loadStop = async (params: Props["params"]) => {
  const { slug } = await params;
  const externalId = /^(\d+)(?:-|$)/.exec(slug)?.[1];
  if (!externalId) notFound();
  const page = await api.content.stop({ externalId });
  if (!page) notFound();
  const canonical = stopPath(page.stop);
  if (canonical !== `/parades/${slug}`) permanentRedirect(canonical);
  return page;
};

const lineList = (codes: string[]) => {
  const sorted = [...codes].sort(compareLineCodes);
  return sorted.length === 1
    ? `la línia ${sorted[0]}`
    : `les línies ${joinCatalan(sorted)}`;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stop } = await loadStop(params);
  const lines = stop.lineCodes.length > 0 ? lineList(stop.lineCodes) : null;
  return pageMetadata({
    title: `parada ${stop.name}: horaris i línies`,
    description: `horaris del bus urbà de lleida a la parada ${stop.name}${
      lines ? `, on para ${lines}` : ""
    }. pròxims busos, parades properes i temps real al mapa.`,
    path: stopPath(stop),
  });
}

const distance = (metres: number) =>
  metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;

const ParadaPage = async ({ params }: Props) => {
  const page = await loadStop(params);
  const { stop } = page;
  const routes = await api.routes.getAll();
  const lines = Object.fromEntries(
    routes.map((r) => [r.code, { color: r.color, name: r.name }]),
  );
  const serving = [...page.lines].sort(compareByLineCode);
  const dates = describeServiceDays(page.days);

  return (
    <ContentPage
      title={stop.name}
      leading={
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
          <MapPin size={20} aria-hidden />
        </span>
      }
      breadcrumbs={[{ label: "parades", href: "/parades" }]}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BusStop",
          name: stop.name,
          url: `${SITE_URL}${stopPath(stop)}`,
          geo: {
            "@type": "GeoCoordinates",
            latitude: stop.latitude,
            longitude: stop.longitude,
          },
        }}
      />

      <p className="text-muted-foreground mt-3 text-base">
        parada del bus urbà de lleida.
      </p>

      <div className="mt-6 space-y-3">
        {serving.length > 0 && (
          <nav aria-label="línies que hi paren">
            <ul className="flex flex-wrap gap-2">
              {serving.map((line) => (
                <li key={line.code}>
                  <Link
                    href={`/linies/${line.code}`}
                    className={cn(
                      "border-border hover:bg-muted/40 flex min-h-12 items-center gap-2 rounded-lg border py-1 pr-3 pl-1 transition-colors",
                      FOCUS_RING,
                    )}
                  >
                    <LineBadge code={line.code} color={line.color} />
                    <span className="text-sm font-medium">
                      línia {line.code}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <Link
          href={`/?stop=${encodeURIComponent(stop.externalId)}`}
          className={cn(
            "bg-foreground text-background flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90",
            FOCUS_RING,
          )}
        >
          <Radio size={18} aria-hidden className="shrink-0" />
          <span className="flex-1">
            quan arriba de debò? temps real al mapa
          </span>
        </Link>
      </div>

      <section id="horaris" className="mt-12 scroll-mt-6 space-y-5">
        <h2 className="text-xl font-semibold">horaris</h2>
        {page.groups.length === 0 ? (
          <p className="text-muted-foreground text-base">
            ara mateix no tenim l&apos;horari d&apos;aquesta parada. al mapa en
            directe pots veure quan hi passa cada bus.
          </p>
        ) : (
          <StopTimetable
            stopId={stop.externalId}
            groups={page.groups}
            lines={lines}
            days={page.days}
            initialDay={todayDayType()}
          />
        )}
      </section>

      {page.nearby.length > 0 && (
        <section id="properes" className="mt-12 scroll-mt-6 space-y-4">
          <h2 className="text-xl font-semibold">parades a prop</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {page.nearby.map((near) => (
              <li key={near.externalId}>
                <Link
                  href={stopPath(near)}
                  className={cn(
                    "border-border hover:bg-muted/40 flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                    FOCUS_RING,
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {near.name}
                    </span>
                    <span className="text-muted-foreground block text-sm">
                      a {distance(near.distanceM)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1">
                    {[...near.lineCodes].sort(compareLineCodes).map((code) => (
                      <LineBadge
                        key={code}
                        code={code}
                        color={lines[code]?.color ?? "#888888"}
                        className="size-7 rounded text-xs"
                      />
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dates && (
        <Note title="d'on surten aquestes hores">
          <p>
            de l&apos;horari programat de moventis, per a un dia concret de cada
            tipus: {dates}. el pròxim bus es marca segons l&apos;hora del teu
            dispositiu.
          </p>
          <p>
            els festius i els canvis de temporada poden tenir un horari
            diferent. per saber quan arriba de debò, mira el temps real al mapa.
          </p>
        </Note>
      )}
    </ContentPage>
  );
};

export default ParadaPage;
