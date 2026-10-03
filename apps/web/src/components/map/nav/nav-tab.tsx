"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface NavTabProps {
  icon: LucideIcon;
  /** The caption under the icon. Lowercase, like every label in the app. */
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}

/**
 * One destination in the bottom bar.
 *
 * A plain `button` with `aria-pressed`, not a `role="tab"`. These open surfaces
 * that live elsewhere in the tree — a drawer, a sheet, a panel in the desktop
 * column — so there is no tabpanel to point `aria-controls` at and no arrow-key
 * roving to honour. Claiming the tab pattern would promise both.
 *
 * `flex-1` over a fixed width so three tabs fill the bar exactly, and the full
 * height of the bar is the target: 64px tall by a third of the viewport clears
 * the 44px minimum by a wide margin, which is the whole point of putting
 * navigation down here.
 */
export const NavTab = ({
  icon: Icon,
  label,
  active,
  onClick,
  title,
}: NavTabProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    title={title ?? label}
    className={cn(
      "flex h-full flex-1 flex-col items-center justify-center gap-1",
      "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
      // The one blue in the system means "this is the live one". Everything
      // else in the bar is muted, so the active tab is the only colour here.
      active ? "text-primary" : "text-muted-foreground",
    )}
  >
    <Icon className="size-5 shrink-0" aria-hidden="true" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

/**
 * A destination in the bottom bar that is a page rather than a surface over
 * the map: a link, so it is crawlable, opens in a new tab on a long press, and
 * carries no `aria-pressed`, since nothing here is ever "on".
 */
export const NavTabLink = ({
  icon: Icon,
  label,
  href,
  title,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  title?: string;
  onClick?: () => void;
}) => (
  <Link
    href={href}
    onClick={onClick}
    title={title ?? label}
    className={cn(
      "text-muted-foreground flex h-full flex-1 flex-col items-center justify-center gap-1",
      "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
    )}
  >
    <Icon className="size-5 shrink-0" aria-hidden="true" />
    <span className="text-xs font-medium">{label}</span>
  </Link>
);
