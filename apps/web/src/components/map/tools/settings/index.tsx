"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import SettingsPanel from "./panel";

const TITLE = "configuració";
const DESCRIPTION =
  "Aquestes preferències es guarden només en aquest dispositiu.";

/**
 * The settings entry point: an icon button beside the search field, opening the
 * same panel in a right-hand sheet on desktop and a bottom drawer on a phone.
 *
 * Two containers rather than one because a sheet on a phone is a strip of content
 * a thumb cannot reach the top of, while on a wide screen an edge-anchored panel
 * keeps the map it covers a strip of, instead of a centred modal parked over the
 * middle of it. Both are the same gesture — something slides in from an edge —
 * which a dialog was not.
 *
 * `md` is Tailwind's own breakpoint, matching where the header card stops being
 * full-bleed. It is deliberately *not* the `lg` the left column switches at: the
 * question here is only whether an edge panel fits, and it does long before a
 * 448px column leaves a map worth reading beside it.
 *
 * The panel is a sibling of the button, not a `DialogTrigger` wrapping it — the
 * button has to keep its own size and styling to line up with the search input,
 * and the open state has to be readable from here anyway to swap containers.
 * Radix still returns focus to the button on close, wherever it sits in the DOM.
 */
const SettingsButton = () => {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <>
      {/*
        `size="icon"` is `size-9`, and `InputGroup` — the search field next to it
        — is `h-9`. They line up natively; anything added here to "match" the
        height is what would break the match.
      */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="configuració"
        title="configuració"
        // Solid over the map tiles in both themes — see the long note in
        // `components/map/index.tsx` for why the `dark:` copies are required
        // and not redundant with the plain classes.
        className="bg-card dark:bg-card dark:hover:bg-accent"
      >
        <Settings />
      </Button>

      {isDesktop ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{TITLE}</SheetTitle>
              <SheetDescription>{DESCRIPTION}</SheetDescription>
            </SheetHeader>
            {/* The sheet is full height, so the settings scroll inside it and
                the title stays put — the whole point of an edge panel over the
                dialog this replaced. */}
            <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
              <SettingsPanel />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{TITLE}</DrawerTitle>
              <DrawerDescription>{DESCRIPTION}</DrawerDescription>
            </DrawerHeader>
            {/* `pb-8` rather than `pb-4`: the last row sits right on the home
                indicator otherwise. */}
            <div className="overflow-y-auto px-4 pb-8">
              <SettingsPanel />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

export default SettingsButton;
