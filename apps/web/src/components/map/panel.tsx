"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A surface in the desktop left column: a card floating on live map tiles.
 *
 * The one shadow in the system's vocabulary is the one the map's own chrome
 * already uses (`shadow-lg` on the header card and the two corner buttons), so
 * these sit at the same height rather than inventing a second elevation step.
 * `rounded-xl` is the card radius; `bg-card` is opaque on purpose — there is a
 * moving map behind this, and a translucent pane over it is unreadable.
 *
 * `min-h-0` because the column is a flex column and the tall panel in it is
 * `flex-1`: without it the panel's own scroller can't shrink and the list runs
 * off the bottom of the window instead of scrolling.
 */
export const Panel = ({
  className,
  ...props
}: React.ComponentProps<"section">) => (
  <section
    className={cn(
      "bg-card text-card-foreground flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-lg",
      // One entrance, from the edge the panel belongs to. `motion-reduce` is
      // not decoration here: this arrives beside a map someone is reading.
      "animate-in fade-in-0 slide-in-from-left-2 duration-200 motion-reduce:animate-none",
      className,
    )}
    {...props}
  />
);

/**
 * The title row every content panel starts with: something on the left, a close
 * button on the right, and nothing that scrolls.
 *
 * `py-3` rather than a square `p-4` — the row's own controls are `size-9`, so
 * even padding makes the header a third of a short panel.
 */
export const PanelHeader = ({
  className,
  children,
  onClose,
  closeLabel = "tanca",
  ...props
}: React.ComponentProps<"div"> & {
  onClose?: () => void;
  closeLabel?: string;
}) => (
  <div
    className={cn(
      "flex shrink-0 flex-row items-center gap-2 px-4 py-3",
      className,
    )}
    {...props}
  >
    {children}
    {onClose && (
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label={closeLabel}
        className="-mr-1 ml-auto shrink-0"
      >
        <X />
      </Button>
    )}
  </div>
);
