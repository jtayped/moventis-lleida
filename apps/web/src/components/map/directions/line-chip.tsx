import { Badge } from "@/components/ui/badge";
import { getContrastTextColor } from "@/lib/contrast";
import { cn } from "@/lib/utils";

/** A line's number on its own colour, the one place line colours appear in this panel. */
export const LineChip = ({
  code,
  color,
  className,
}: {
  code: string;
  color: string;
  className?: string;
}) => (
  <Badge
    className={cn(
      "h-6 min-w-6 justify-center rounded-md px-1.5 text-xs font-semibold",
      className,
    )}
    style={{ backgroundColor: color, color: getContrastTextColor(color) }}
    aria-label={`línia ${code}`}
  >
    {code}
  </Badge>
);
