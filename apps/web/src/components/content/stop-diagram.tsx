/**
 * A route's stops as a line diagram in the line's colour: a rail with a dot per
 * stop, the two ends filled. The same picture the lines panel draws, so the page
 * and the map read as one thing.
 *
 * Draws with `var(--line)`, so it sits inside an element carrying
 * `lineAccentStyle` and `LINE_ACCENT_CLASS`.
 */
export const StopDiagram = ({
  stops,
}: {
  stops: { externalId: string; name: string | null }[];
}) => (
  <ol className="relative ml-1.5 text-sm">
    <span
      aria-hidden
      className="absolute top-3 bottom-3 left-[5px] w-[3px] rounded-full bg-(--line)"
    />
    {stops.map((stop, i) => {
      const end = i === 0 || i === stops.length - 1;
      return (
        <li
          key={`${stop.externalId}-${i}`}
          className="relative flex items-center gap-3 py-2"
        >
          <span
            aria-hidden
            className={`relative z-10 size-[13px] shrink-0 rounded-full border-[3px] border-(--line) ${end ? "bg-(--line)" : "bg-background"}`}
          />
          <span className={end ? "font-semibold" : "leading-snug"}>
            {stop.name ?? `parada ${stop.externalId}`}
          </span>
        </li>
      );
    })}
  </ol>
);
