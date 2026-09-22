"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Without this a failed stop query is a map with no pins on it, which reads as
 * "this line has no stops" rather than "we couldn't ask".
 *
 * Lives in its own module because the search results need the same thing for
 * the same reason: an empty list after a failed fetch reads as "no such stop".
 */
export const StopsError = ({ onRetry }: { onRetry: () => void }) => (
  <div
    role="status"
    className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
  >
    <TriangleAlert size={14} className="shrink-0" />
    <span className="min-w-0 flex-1">
      no s&apos;han pogut carregar les parades
    </span>
    <Button
      onClick={onRetry}
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 px-2 text-xs underline underline-offset-2"
    >
      torna-ho a provar
    </Button>
  </div>
);

export default StopsError;
