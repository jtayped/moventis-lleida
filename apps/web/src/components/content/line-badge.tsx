import { getContrastTextColor } from "@/lib/contrast";
import { compareLineCodes } from "@/lib/lines";
import { joinCatalan } from "@/lib/service-time";
import { cn } from "@/lib/utils";

/** A line's code on its own colour, the way the map and the lines panel draw it. */
export const LineBadge = ({
  code,
  color,
  className,
  decorative = false,
}: {
  code: string;
  color: string;
  className?: string;
  /**
   * Hide it from screen readers, for when the text beside it already says
   * "línia 1". Otherwise it reads as a bare "1" before it.
   */
  decorative?: boolean;
}) => (
  <span
    aria-hidden={decorative || undefined}
    className={cn(
      "flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-bold",
      className,
    )}
    style={{ backgroundColor: color, color: getContrastTextColor(color) }}
  >
    {code}
  </span>
);

/**
 * The small badges of every line serving a stop, read out as one phrase
 * ("línies 1, 6 i 7") instead of a run of bare numbers.
 */
export const LineBadges = ({
  codes,
  colors,
}: {
  codes: string[];
  colors: Record<string, string>;
}) => {
  const sorted = [...codes].sort(compareLineCodes);
  if (sorted.length === 0) return null;
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1">
      <span className="sr-only">
        , {sorted.length === 1 ? "línia" : "línies"} {joinCatalan(sorted)}
      </span>
      {sorted.map((code) => (
        <LineBadge
          key={code}
          code={code}
          color={colors[code] ?? "#888888"}
          className="size-7 rounded text-xs"
          decorative
        />
      ))}
    </span>
  );
};
