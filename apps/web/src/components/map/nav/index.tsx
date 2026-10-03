"use client";

import { LayoutList, MapPin, Search, Settings } from "lucide-react";

import { NavTab, NavTabLink } from "@/components/map/nav/nav-tab";
import { track } from "@/lib/analytics";
import type { NavPanel } from "@/hooks/use-nav-panel";
import { cn } from "@/lib/utils";

/** The pages: they leave the map, so they are links. */
const PAGE_TABS = [
  {
    page: "linies",
    href: "/linies",
    icon: LayoutList,
    label: "línies",
    title: "línies i horaris",
  },
  {
    page: "parades",
    href: "/parades",
    icon: MapPin,
    label: "parades",
    title: "totes les parades",
  },
] as const;

/** The surfaces that open over the map: buttons with a pressed state. */
const PANEL_TABS = [
  { panel: "search", icon: Search, label: "cerca", title: "busca una parada" },
  {
    panel: "settings",
    icon: Settings,
    label: "configuració",
    title: "configuració",
  },
] as const satisfies readonly {
  panel: NavPanel;
  icon: typeof Search;
  label: string;
  title: string;
}[];

interface MapNavProps {
  active: NavPanel | null;
  onSelect: (panel: NavPanel) => void;
  /** False while a modal destination is covering it — see `useNavPanel`. */
  visible: boolean;
}

/**
 * The bottom navigation, below `lg` only.
 *
 * Four destinations and nothing else: two pages (línies, parades) as links,
 * and two surfaces over the map (cerca, configuració) as buttons. The location
 * button is not here on purpose: it is an action on the map, not a place to be, and putting it in a
 * bar of destinations would be the one entry that does not change what is on
 * screen. The saved stops are not here either — they are a filter over the
 * map's pins, which is what the line strip already is, and that is where they
 * stay.
 *
 * `lg:hidden` and not a `useIsDesktop` branch, so a desktop window never paints
 * a mobile bar across the bottom before hydration settles. There is nothing to
 * mount twice here, so there is no reason to reach for JS.
 *
 * Opaque, with a top border and no shadow. There are live map tiles behind it,
 * which rules out translucency, and a full-bleed bar anchored to an edge is the
 * stop drawer's situation rather than the floating filter card's — the same
 * reason the drawer uses a stroke instead of an elevation step.
 *
 * `z-[60]` puts it over the stop timetable, which is `z-50` and deliberately
 * non-modal: you must be able to navigate while a stop is open, and that is the
 * commonest state in the app. It never floats over a scrim, because `visible`
 * goes false for the two destinations that draw one.
 */
export const MapNav = ({ active, onSelect, visible }: MapNavProps) => (
  <nav
    aria-label="navegació principal"
    aria-hidden={!visible}
    className={cn(
      "fixed inset-x-0 bottom-0 z-[60] flex h-[var(--nav-height)] items-stretch lg:hidden",
      // The `dark:` copies are not redundant with the plain ones: `globals.css`
      // declares the dark variant as `&:is(.dark *)`, so a `dark:` utility
      // outranks an unprefixed one whatever the source order. See the longer
      // note in `components/map/index.tsx`.
      "bg-card dark:bg-card border-border border-t",
      // The bar's background runs into the home indicator; its buttons do not.
      "pb-[env(safe-area-inset-bottom,0px)]",
      "transition-transform duration-200 motion-reduce:transition-none",
      visible ? "translate-y-0" : "pointer-events-none translate-y-full",
    )}
  >
    {PAGE_TABS.map((tab) => (
      <NavTabLink
        key={tab.page}
        href={tab.href}
        icon={tab.icon}
        label={tab.label}
        title={tab.title}
        onClick={() =>
          track("content page opened", { page: tab.page, source: "nav" })
        }
      />
    ))}
    {PANEL_TABS.map((tab) => (
      <NavTab
        key={tab.panel}
        icon={tab.icon}
        label={tab.label}
        title={tab.title}
        active={active === tab.panel}
        onClick={() => onSelect(tab.panel)}
      />
    ))}
  </nav>
);

export default MapNav;
