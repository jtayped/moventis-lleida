import { getContrastTextColor } from "@/lib/contrast";
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
