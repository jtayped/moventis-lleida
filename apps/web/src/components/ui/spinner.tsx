"use client";

import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLang } from "@/i18n/lang-context";
import { mapCopy } from "@/i18n/copy/map";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const t = mapCopy[useLang()].ui;
  return (
    <Loader2Icon
      role="status"
      aria-label={t.loading}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
