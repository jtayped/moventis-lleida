import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Which container the timetable is sitting in.
 *
 * `sheet` is the vaul bottom sheet — a phone, and any window too narrow for the
 * desktop column. `panel` is the floating card in that column. The difference is
 * not decorative: the sheet is a Radix dialog with a drag handle, snap points and
 * a close that has to be armed a render early, and none of that exists in a panel
 * that is simply mounted.
 */
export type StopDetailsVariant = "sheet" | "panel";

/**
 * The frame every branch of the stop details shares — loading, error and the
 * timetable itself — so a failed stop is laid out like a loaded one. It used to
 * be copied into two of the three, and the third (the error state) went
 * full-bleed on desktop while its siblings centred.
 */
export const StopDetailsShell = ({
  variant,
  className,
  ...props
}: React.ComponentProps<"div"> & { variant: StopDetailsVariant }) => (
  <div
    className={cn(
      "flex min-h-0 flex-1 flex-col p-4",
      // The sheet's own drag handle sits directly above this, and between `md`
      // and the column's `lg` the sheet is wider than a timetable wants to be,
      // so it centres on a readable measure instead of spanning the window.
      variant === "sheet" && "mt-4 md:mx-auto md:w-lg",
      className,
    )}
    {...props}
  />
);
