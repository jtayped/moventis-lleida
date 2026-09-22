"use client";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingsButtonProps {
  onOpen: () => void;
  className?: string;
}

/**
 * The gear beside the search field — the desktop door to the settings panel.
 *
 * Only a button: the panel it opens is mounted once at the top of the map shell
 * (`SettingsSurface`), because below `lg` the same panel is reached from the
 * bottom nav instead and two containers would mean two `SettingsPanel`s writing
 * the same localStorage key.
 *
 * Hidden below `lg` by its caller, on the same breakpoint the nav appears at, so
 * settings always has exactly one door.
 */
export const SettingsButton = ({ onOpen, className }: SettingsButtonProps) => (
  // `size="icon"` is `size-9`, and `InputGroup` — the search field next to it —
  // is `h-9`. They line up natively; anything added here to "match" the height
  // is what would break the match.
  <Button
    variant="outline"
    size="icon"
    onClick={onOpen}
    aria-label="configuració"
    title="configuració"
    // Solid over the map tiles in both themes — see the long note in
    // `components/map/index.tsx` for why the `dark:` copies are required and
    // not redundant with the plain classes.
    className={cn("bg-card dark:bg-card dark:hover:bg-accent", className)}
  >
    <Settings />
  </Button>
);

export default SettingsButton;
