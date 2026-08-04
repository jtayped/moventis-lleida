import TimeSourceBadge from "./time-source-badge";

/**
 * One-line key for the two kinds of arrival time.
 *
 * Rendered only when the stop is currently showing at least one timetable-only
 * time — when everything is live, the green "en directe" badges need no gloss,
 * and a permanent legend would just be clutter in a drawer that is mostly
 * consulted at a bus stop in a hurry.
 */
export default function ScheduleLegend() {
  return (
    <dl className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px]">
      <div className="flex items-center gap-1.5">
        <dt>
          <TimeSourceBadge isRealTime className="text-[11px]" />
        </dt>
        <dd>el bus envia la seva posició</dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt>
          <TimeSourceBadge isRealTime={false} className="text-[11px]" />
        </dt>
        <dd>hora prevista a l&apos;horari oficial</dd>
      </div>
    </dl>
  );
}
