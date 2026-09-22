"use client";

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

interface SettingsSurfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The settings panel's container: the same panel in a right-hand sheet on a
 * wide screen and a bottom drawer on a phone.
 *
 * Two containers rather than one because a sheet on a phone is a strip of
 * content a thumb cannot reach the top of, while on a wide screen an
 * edge-anchored panel keeps the map it covers a strip of, instead of a centred
 * modal parked over the middle of it. Both are the same gesture — something
 * slides in from an edge — which a dialog was not.
 *
 * `md` is Tailwind's own breakpoint, matching where the header card stops being
 * full-bleed. It is deliberately *not* the `lg` the left column switches at:
 * the question here is only whether an edge panel fits, and it does long before
 * a 448px column leaves a map worth reading beside it. The consequence is that
 * on a tablet in portrait the bottom nav's `Configuració` tab opens the
 * right-hand sheet, which is right — the tab is about reaching settings, the
 * breakpoint is about what shape they should arrive in.
 *
 * Controlled, and mounted once at the top of the map shell rather than beside
 * the button that opens it. It now has two doors — the gear from `lg`, the nav
 * tab below it — and mounting one container per door would mean two
 * `SettingsPanel`s, each with its own `useSettings` writing the same key.
 */
export const SettingsSurface = ({
  open,
  onOpenChange,
}: SettingsSurfaceProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return isDesktop ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{TITLE}</SheetTitle>
          <SheetDescription>{DESCRIPTION}</SheetDescription>
        </SheetHeader>
        {/* The sheet is full height, so the settings scroll inside it and the
            title stays put — the whole point of an edge panel over the dialog
            this replaced. */}
        <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
          <SettingsPanel />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  ) : (
    <Drawer open={open} onOpenChange={onOpenChange}>
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
  );
};

export default SettingsSurface;
