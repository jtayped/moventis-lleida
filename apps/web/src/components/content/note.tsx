import { ChevronDown, Info } from "lucide-react";
import React from "react";
import { FOCUS_RING } from "@/components/content/styles";
import { cn } from "@/lib/utils";

/**
 * Content behind an obvious dropdown: a full-width row with a chevron that
 * turns when it opens. Closed by default, so a page leads with what people came
 * for; the text is still in the HTML for anyone, or anything, that reads it.
 */
export const Disclosure = ({
  summary,
  icon,
  className,
  children,
}: {
  summary: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <details className={cn("group border-border rounded-xl border", className)}>
    <summary
      className={cn(
        "hover:bg-muted/50 flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden",
        FOCUS_RING,
      )}
    >
      {icon}
      <span className="flex-1">{summary}</span>
      <ChevronDown
        size={16}
        className="text-muted-foreground shrink-0 group-open:rotate-180 motion-safe:transition-transform"
      />
    </summary>
    <div className="px-4 pb-4">{children}</div>
  </details>
);

/** Small print, such as where the data comes from, in a {@link Disclosure}. */
export const Note = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Disclosure
    summary={title}
    icon={<Info size={16} className="shrink-0" />}
    className="mt-8"
  >
    <div className="text-muted-foreground space-y-2 text-sm leading-relaxed">
      {children}
    </div>
  </Disclosure>
);
