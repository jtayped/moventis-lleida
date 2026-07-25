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
  const { isPreferida, togglePreferida } = useBusFinder();
  const saved = isPreferida(externalId);

  return (
    <Button
      onClick={() => togglePreferida(externalId)}
      variant="ghost"
      size="icon"
      aria-pressed={saved}
      aria-label={saved ? "Treu de preferides" : "Afegeix a preferides"}
      title={saved ? "treu de preferides" : "afegeix a preferides"}
      className={cn(
        saved
          ? "text-amber-500 hover:text-amber-600"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Star size={20} className={saved ? "fill-current" : undefined} />
    </Button>
  );
};

export default PreferidaToggle;
