import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MapPin, Radio } from "lucide-react";
import { ContentPage } from "@/components/content/content-page";
import { LineBadge, LineBadges } from "@/components/content/line-badge";
import { Note } from "@/components/content/note";
import { StopTimetable } from "@/components/content/stop-timetable";
import { FOCUS_RING } from "@/components/content/styles";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/constants/metadata";
import { compareByLineCode, compareLineCodes } from "@/lib/lines";
import { localePath } from "@moventis/shared";
import { contentCopy } from "@/i18n/copy/content";
import { stopsCopy } from "@/i18n/copy/stops";
import { asLang } from "@/i18n/langs";
import { pageMetadata } from "@/lib/seo";
import { describeServiceDays, todayDayType } from "@/lib/service-time";
import { stopPath } from "@/lib/stops";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/server";

// Stops and timetables come from the database, which the build cannot reach.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ lang: string; slug: string }>;
}

/**
 * The stop behind `/parades/10242-placa-espanya-saracibar`. Only the leading id
 * is read; a URL with an old or missing name redirects to the current one.
 */
const loadStop = async (params: Props["params"]) => {
  const { slug, lang: segment } = await params;
  const lang = asLang(segment);
  const externalId = /^(\d+)(?:-|$)/.exec(slug)?.[1];
  if (!externalId) notFound();
  const page = await api.content.stop({ externalId });
  if (!page) notFound();
  const canonical = stopPath(page.stop);
  if (canonical !== `/parades/${slug}`) {
    permanentRedirect(localePath(lang, canonical));
  }
  return { ...page, lang };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stop, lang } = await loadStop(params);
  const t = stopsCopy[lang].page;
  // The line numbers are what tells this stop's result apart from moventis'.
  const codes = [...stop.lineCodes].sort(compareLineCodes);
  const joined = contentCopy[lang].joinList(codes);
  return pageMetadata({
    title: t.title(stop.name, codes.length, joined),
    description: t.description(stop.name, codes.length, joined),
    path: stopPath(stop),
    lang,
  });
}

const distance = (metres: number) =>
  metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;

const ParadaPage = async ({ params }: Props) => {
  const page = await loadStop(params);
  const { lang } = page;
  const { stop } = page;
  const t = stopsCopy[lang].page;
  const routes = await api.routes.getAll();
  const lines = Object.fromEntries(
    routes.map((r) => [r.code, { color: r.color, name: r.name }]),
  );
  const colors = Object.fromEntries(routes.map((r) => [r.code, r.color]));
  const serving = [...page.lines].sort(compareByLineCode);
  const dates = describeServiceDays(page.days, lang);

  return (
    <ContentPage
      lang={lang}
      section="/parades"
      title={stop.name}
      leading={
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
          <MapPin size={20} aria-hidden />
        </span>
      }
      breadcrumbs={[{ label: t.breadcrumb, href: "/parades" }]}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BusStop",
          name: stop.name,
          url: `${SITE_URL}${localePath(lang, stopPath(stop))}`,
          geo: {
            "@type": "GeoCoordinates",
            latitude: stop.latitude,
            longitude: stop.longitude,
          },
        }}
      />

      <p className="text-muted-foreground mt-3 text-base">{t.intro}</p>

      <div className="mt-6 space-y-3">
        {serving.length > 0 && (
          <nav aria-label={t.servingLines}>
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
                    <LineBadge code={line.code} color={line.color} decorative />
                    <span className="text-sm font-medium">
                      {t.line(line.code)}
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
          <span className="flex-1">{t.realtime}</span>
        </Link>
      </div>

      <section id="horaris" className="mt-12 scroll-mt-6 space-y-5">
        <h2 className="text-xl font-semibold">{t.timetables}</h2>
        {page.groups.length === 0 ? (
          <p className="text-muted-foreground text-base">{t.noTimetable}</p>
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
          <h2 className="text-xl font-semibold">{t.nearby}</h2>
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
                      {t.away(distance(near.distanceM))}
                    </span>
                  </span>
                  <LineBadges codes={near.lineCodes} colors={colors} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dates && (
        <Note title={t.noteTitle}>
          <p>{t.noteDates(dates)}</p>
          <p>{t.noteHolidays}</p>
        </Note>
      )}
    </ContentPage>
  );
};

export default ParadaPage;
