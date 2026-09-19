"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { cn } from "@/lib/utils";

/**
 * Anchored above the map's own bottom row (`h-12` buttons inside `p-4`, `md:p-6`)
 * rather than over it, so the notice never covers "línies" or "ubicació".
 *
 * Which corner it takes follows which one is free. From `md` that is the left,
 * because "ubicació" holds the right. From `lg` it swaps back: the whole left
 * edge is the floating column, down to the "línies" button under it.
 *
 * `z-20` clears the map's overlays at `z-10` and stays under the drawer at `z-50`
 * — an open stop should not have a banner floating on top of it.
 */
const ANCHOR = "fixed bottom-20 z-20 md:bottom-24";

/**
 * The storage notice, shown once and never again.
 *
 * Deliberately not a modal. Nothing here is withheld pending an answer — the one
 * feature it governs is exempt from needing consent in the first place (see
 * `use-cookie-consent.ts`) — so blocking the map behind it would be theatre, and
 * would block it for the far larger group who came to catch a bus.
 *
 * Once answered this renders nothing. The way back to the choice is the settings
 * panel's "privadesa i dades" section, reachable from the header — a permanent
 * floating link over the map cost every visitor screen space to serve the few who
 * ever change their mind.
 */
const CookieBanner = () => {
  const { status, hydrated, accept, decline } = useCookieConsent();

  // Nothing at all until localStorage has been read: rendering the notice first
  // and pulling it away a tick later is worse than showing it a tick late.
  if (!hydrated) return null;

  // Answered is answered, either way. Revisiting the choice happens in the
  // settings panel now, so there is nothing left for this to render.
  if (status !== "unset") return null;

  return (
    <section
      aria-label="preferències de privadesa"
      className={cn(
        ANCHOR,
        "bg-card text-card-foreground inset-x-4 flex gap-3 rounded-xl border p-4 shadow-lg md:right-auto md:left-6 md:w-sm lg:right-6 lg:left-auto",
      )}
    >
      {/* The same amber chip the line strip uses for the saved stops, because
          this notice is about exactly one thing and that is the thing. */}
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm bg-amber-400 text-zinc-900"
      >
        <Star size={12} className="fill-current" />
      </span>

      <div className="min-w-0 space-y-3">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Aquest lloc guarda al teu navegador les parades que marquis com a
          preferides, només en aquest dispositiu. No fem servir cookies de
          seguiment. Comptem visites de forma anònima amb una eina pròpia, i
          pots desactivar-ho a la configuració.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={accept}
            aria-label="accepta l'ús de l'emmagatzematge local per a les preferides"
          >
            d&apos;acord
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={decline}
            aria-label="rebutja l'ús de l'emmagatzematge local per a les preferides"
          >
            rebutja
          </Button>
          <Link
            href="/privadesa"
            className="text-muted-foreground hover:text-foreground ml-auto text-xs underline underline-offset-4 transition-colors"
          >
            més informació
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CookieBanner;
