"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusFinder } from "@/context/buses";
import { cn } from "@/lib/utils";

/**
 * Saves or unsaves this stop. A star rather than the badge the line strip uses:
 * from inside a stop, `preferides` isn't a set to switch on and off, it's one fact
 * about the stop being looked at — so it reads as state, not as a filter.
 *
 * Amber-500 for the glyph, where the map's mark is amber-400. A thin stroke needs
 * the darker end of the ramp to hold against a white drawer; the map's mark is a
 * filled disc, and can afford the lighter one.
 *
 * Lives in the header so it's reachable in the one case that matters most: a stop
 * that has left the network still opens here, and this is the only way to get its
 * pin off the map.
 */
const PreferidaToggle = ({ externalId }: { externalId: string }) => {
  const { isPreferida, togglePreferida, preferidesDisabled } = useBusFinder();
  const saved = isPreferida(externalId);

  const label = preferidesDisabled
    ? "Preferides desactivades: has rebutjat desar dades en aquest dispositiu"
    : saved
      ? "Treu de preferides"
      : "Afegeix a preferides";

  return (
    // The tooltip hangs on the wrapper rather than on the button, because the one
    // case that most needs explaining is the disabled one — and `buttonVariants`
    // gives a disabled button `pointer-events-none`, so a `title` on it never fires.
    // Lowercased explicitly: unlike the rest of the page, a native `title` tooltip
    // isn't inside the DOM the body's `lowercase` class reaches.
    <span title={label.toLowerCase()}>
      <Button
        onClick={() => togglePreferida(externalId)}
        disabled={preferidesDisabled}
        variant="ghost"
        size="icon"
        aria-pressed={saved}
        aria-label={label}
        className={cn(
          saved
            ? "text-amber-500 hover:text-amber-600"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Star size={20} className={saved ? "fill-current" : undefined} />
      </Button>
    </span>
  );
};

export default PreferidaToggle;
