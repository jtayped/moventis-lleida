import { getContrastTextColor } from "@/lib/contrast";
import { cn } from "@/lib/utils";

/** A line's code on its own colour, the way the map and the lines panel draw it. */
export const LineBadge = ({
  code,
  color,
  className,
}: {
  code: string;
  color: string;
  className?: string;
}) => (
  <span
    className={cn(
      "flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-bold",
      className,
    )}
    style={{ backgroundColor: color, color: getContrastTextColor(color) }}
  >
    {code}
  </span>
);
