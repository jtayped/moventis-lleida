"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import SettingsPanel from "./panel";

const TITLE = "configuració";
const DESCRIPTION =
  "Aquestes preferències es guarden només en aquest dispositiu.";

/**
 * The settings entry point: an icon button beside the search field, opening the
 * same panel in a dialog on desktop and a bottom drawer on a phone.
 *
 * Two containers rather than one because a centred modal on a phone lands under
 * the thumb reach of nothing in particular, while a bottom sheet on a wide screen
 * is a strip of content under a screen of dimmed map. `md` is Tailwind's own
 * breakpoint, matching where the header card itself stops being full-bleed.
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{TITLE}</DialogTitle>
              <DialogDescription>{DESCRIPTION}</DialogDescription>
            </DialogHeader>
            <SettingsPanel />
          </DialogContent>
        </Dialog>
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
