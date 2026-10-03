"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDownUp,
  ArrowLeft,
  Circle,
  Clock,
  Footprints,
  MapPin,
  X,
} from "lucide-react";
import type { WalkLeg } from "@moventis/shared";

import { Panel, PanelHeader } from "@/components/map/panel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useDirections,
  type DirectionsPlace,
  type PlaceField,
} from "@/context/directions";
import type { DirectionsPlanState } from "@/hooks/use-directions-plan";
import type { GeolocationStatus } from "@/hooks/use-geolocation";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { clock, distance, duration, placeLabel } from "./format";
import { ItineraryCard, ItinerarySummary } from "./itinerary-card";
import { ItinerarySteps } from "./itinerary-steps";
import { PlacePicker } from "./place-picker";

export type DirectionsVariant = "panel" | "overlay";

interface DirectionsPanelProps {
  /** `panel` is the desktop column card; `overlay` covers the phone screen. */
  variant: DirectionsVariant;
  plan: DirectionsPlanState;
  locationStatus: GeolocationStatus;
  requestLocation: () => void;
}

/** A minute is the timetable's resolution, so the "leave in" copy ticks with it. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const FieldButton = ({
  field,
  place,
  onEdit,
}: {
  field: PlaceField;
  place: DirectionsPlace | null;
  onEdit: () => void;
}) => {
  const label = placeLabel(place);
  const Icon = field === "from" ? Circle : MapPin;
  return (
    <button
      type="button"
      onClick={onEdit}
      className="hover:bg-accent focus-visible:ring-ring/50 border-border flex h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      aria-label={`${field === "from" ? "origen" : "destinació"}: ${label ?? "per triar"}`}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          field === "from" ? "text-muted-foreground" : "text-destructive",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          label ? "font-medium" : "text-muted-foreground",
        )}
      >
        {label ?? (field === "from" ? "tria l'origen" : "on vols anar?")}
      </span>
    </button>
  );
};

/** "Leave now" or a clock time; a time already past today means tomorrow. */
const DepartureControl = () => {
  const { departAt, setDepartAt } = useDirections();
  const [custom, setCustom] = useState(departAt !== null);

  const toInput = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const onTime = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) return;
    const at = new Date();
    at.setHours(h, m, 0, 0);
    if (at.getTime() < Date.now() - 5 * 60_000) at.setDate(at.getDate() + 1);
    setDepartAt(at);
  };

  const tomorrow =
    departAt !== null && departAt.getDate() !== new Date().getDate();

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className="text-muted-foreground size-4 shrink-0" aria-hidden />
      {custom ? (
        <>
          <label className="flex items-center gap-2">
            <span>surt a les</span>
            <input
              type="time"
              className="border-border bg-background h-8 rounded-md border px-2 tabular-nums"
              value={departAt ? toInput(departAt) : ""}
              onChange={(e) => onTime(e.target.value)}
            />
          </label>
          {tomorrow && <span className="text-muted-foreground">demà</span>}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setCustom(false);
              setDepartAt(null);
            }}
          >
            surt ara
          </Button>
        </>
      ) : (
        <>
          <span>surt ara</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setCustom(true);
              const at = new Date(Date.now() + 15 * 60_000);
              at.setSeconds(0, 0);
              setDepartAt(at);
            }}
          >
            canvia l&apos;hora
          </Button>
        </>
      )}
    </div>
  );
};

const Message = ({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "error";
}) => (
  <p
    className={cn(
      "px-4 py-3 text-sm",
      tone === "error" ? "text-destructive" : "text-muted-foreground",
    )}
  >
    {children}
  </p>
);

const WalkOnlyCard = ({ leg }: { leg: WalkLeg }) => (
  <li className="border-border flex items-center gap-3 rounded-xl border px-4 py-3">
    <Footprints className="text-muted-foreground size-5 shrink-0" aria-hidden />
    <div className="min-w-0 flex-1 text-sm">
      <p className="font-medium">a peu, {distance(leg.meters)}</p>
      <p className="text-muted-foreground text-xs tabular-nums">
        {clock(leg.startAt)} – {clock(leg.endAt)}
      </p>
    </div>
    <span className="text-sm font-semibold tabular-nums">
      {duration((leg.endAt.getTime() - leg.startAt.getTime()) / 1000)}
    </span>
  </li>
);

/**
 * The directions destination: two places, a departure time, and the options
 * between them. Selecting an option draws it on the map; on desktop it opens
 * in place, on a phone the panel steps aside for the map and keeps the steps
 * in a card at the bottom.
 */
export const DirectionsPanel = ({
  variant,
  plan,
  locationStatus,
  requestLocation,
}: DirectionsPanelProps) => {
  const d = useDirections();
  const now = useNow();
  // Opening with no destination (the map's button) goes straight to choosing
  // one: an empty form with nothing focused is a step nobody wants to take.
  const [editing, setEditing] = useState<PlaceField | null>(d.to ? null : "to");

  const locationRefused =
    locationStatus === "error" || locationStatus === "unsupported";

  // "My location" means asking the device, and the map's button may never
  // have been pressed. Only from idle: after a refusal, asking again on every
  // render would be a prompt loop.
  const usesLocation = d.from?.kind === "location" || d.to?.kind === "location";
  useEffect(() => {
    if (usesLocation && locationStatus === "idle") requestLocation();
  }, [usesLocation, locationStatus, requestLocation]);

  const pick = (field: PlaceField, place: DirectionsPlace) => {
    track("directions place chosen", { field, kind: place.kind });
    d.setPlace(field, place);
    setEditing(null);
  };

  const itineraries = plan.query?.data?.itineraries ?? [];
  const selected = itineraries.find((i) => i.id === d.selectedId) ?? null;
  const destinationLabel = placeLabel(d.to) ?? "destinació";

  const onSelect = (id: string) => {
    if (d.selectedId === id && variant === "panel") {
      d.select(null);
      return;
    }
    const it = itineraries.find((i) => i.id === id);
    if (it) track("itinerary selected", { transfers: it.transfers });
    d.select(id);
  };

  // ── Phone, an option chosen: the map is the point now. ──────────────────
  if (variant === "overlay" && selected) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[70] flex flex-col justify-between pt-[env(safe-area-inset-top)]">
        <div className="bg-card pointer-events-auto m-3 flex items-center gap-1 rounded-xl border p-1.5 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => d.select(null)}
            aria-label="torna a les opcions"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0 flex-1 text-sm leading-tight">
            <p className="text-muted-foreground truncate">
              {placeLabel(d.from)}
            </p>
            <p className="truncate font-medium">{destinationLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={d.close}
            aria-label="tanca les indicacions"
          >
            <X />
          </Button>
        </div>
        <section
          aria-label="itinerari"
          className="bg-card pointer-events-auto max-h-[45vh] overflow-y-auto rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)] shadow-lg"
        >
          <div className="bg-muted mx-auto mt-2 h-1 w-10 rounded-full" />
          <div className="px-4 pt-3 pb-1">
            <ItinerarySummary itinerary={selected} now={now} />
          </div>
          <ItinerarySteps
            itinerary={selected}
            destinationLabel={destinationLabel}
          />
        </section>
      </div>
    );
  }

  // ── Picking a point: get out of the map's way. ──────────────────────────
  const pickingHint = d.picking && (
    <div className="flex items-center gap-3 px-4 py-3 text-sm">
      <MapPin className="size-4 shrink-0 text-blue-600" aria-hidden />
      <span className="min-w-0 flex-1">
        toca el mapa o una parada per triar{" "}
        {d.picking === "from" ? "l'origen" : "la destinació"}
      </span>
      <Button variant="ghost" size="sm" onClick={d.stopPicking}>
        cancel·la
      </Button>
    </div>
  );
  if (variant === "overlay" && d.picking) {
    return (
      <div className="bg-card fixed inset-x-3 top-3 z-[70] mt-[env(safe-area-inset-top)] rounded-xl border shadow-lg">
        {pickingHint}
      </div>
    );
  }

  const query = plan.query;
  const plannedError = query?.error;
  const body = editing ? (
    <PlacePicker
      key={editing}
      field={editing}
      locationAvailable={!locationRefused}
      onPick={(place) => pick(editing, place)}
      onPickOnMap={() => {
        setEditing(null);
        d.startPicking(editing);
      }}
    />
  ) : d.picking ? (
    pickingHint
  ) : plan.blocker === "incomplete" ? (
    <Message>tria d&apos;on surts i on vas</Message>
  ) : plan.blocker === "locating" ? (
    <Message>
      <span className="inline-flex items-center gap-2">
        <Spinner /> buscant la teva ubicació
      </span>
    </Message>
  ) : plan.blocker === "no-location" ? (
    <Message tone="error">
      no podem saber on ets. tria l&apos;origen al mapa o per parada
    </Message>
  ) : plan.blocker === "out-of-area" ? (
    <Message>
      ets fora de lleida. tria l&apos;origen al mapa o per parada
    </Message>
  ) : plan.blocker === "same-place" ? (
    <Message>l&apos;origen i la destinació són el mateix lloc</Message>
  ) : !query || query.isLoading ? (
    <Message>
      <span className="inline-flex items-center gap-2">
        <Spinner /> calculant la ruta
      </span>
    </Message>
  ) : plannedError ? (
    <div className="px-4 py-3 text-sm">
      <p className="text-destructive">
        {plannedError.data?.code === "PRECONDITION_FAILED"
          ? "encara no tenim l'horari d'aquest dia"
          : "no s'ha pogut calcular la ruta"}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => void query.refetch()}
      >
        torna-ho a provar
      </Button>
    </div>
  ) : (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      {query.data && query.data.missingLines.length > 0 && (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          sense horari per a{" "}
          {query.data.missingLines.length === 1 ? "la línia" : "les línies"}{" "}
          {query.data.missingLines.join(", ")}: no s&apos;han tingut en compte
        </p>
      )}
      <ul className="space-y-2" aria-label="opcions">
        {query.data?.walkOnly && <WalkOnlyCard leg={query.data.walkOnly} />}
        {itineraries.map((it) => (
          <ItineraryCard
            key={it.id}
            itinerary={it}
            now={now}
            selected={it.id === d.selectedId}
            onSelect={onSelect}
          >
            {variant === "panel" && it.id === d.selectedId && (
              <ItinerarySteps
                itinerary={it}
                destinationLabel={destinationLabel}
              />
            )}
          </ItineraryCard>
        ))}
      </ul>
      {itineraries.length === 0 && (
        <Message>
          cap combinació en bus en les properes tres hores
          {query.data?.walkOnly ? ", però hi pots anar a peu" : ""}
        </Message>
      )}
    </div>
  );

  const content = (
    <>
      <PanelHeader onClose={d.close} closeLabel="tanca les indicacions">
        <span className="font-semibold">com arribar-hi</span>
      </PanelHeader>
      <div className="flex shrink-0 gap-2 px-4 pb-3">
        <div className="min-w-0 flex-1 space-y-2">
          <FieldButton
            field="from"
            place={d.from}
            onEdit={() => setEditing("from")}
          />
          <FieldButton
            field="to"
            place={d.to}
            onEdit={() => setEditing("to")}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="self-center"
          onClick={() => {
            setEditing(null);
            d.swap();
          }}
          aria-label="intercanvia origen i destinació"
        >
          <ArrowDownUp />
        </Button>
      </div>
      {!editing && (
        <div className="border-border shrink-0 border-b px-4 pb-3">
          <DepartureControl />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col pt-3">{body}</div>
    </>
  );

  if (variant === "panel") {
    return (
      <Panel aria-label="com arribar-hi" className="h-full">
        {content}
      </Panel>
    );
  }

  return (
    <section
      aria-label="com arribar-hi"
      className="bg-background fixed inset-0 z-[70] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      {content}
    </section>
  );
};

export default DirectionsPanel;
