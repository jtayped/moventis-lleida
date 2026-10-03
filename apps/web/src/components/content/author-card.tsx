import { ArrowUpRight, Coffee } from "lucide-react";
import { GithubMark } from "@/components/content/github-mark";
import { FOCUS_RING } from "@/components/content/styles";
import {
  AUTHOR_NAME,
  GITHUB_URL,
  KO_FI_URL,
  PORTFOLIO_URL,
} from "@/lib/project-links";
import { cn } from "@/lib/utils";

/** Told to screen readers on every link that opens a new tab, as WCAG asks. */
const NewTab = () => (
  <span className="sr-only"> (s&apos;obre en una pestanya nova)</span>
);

const [FIRST_NAME, ...rest] = AUTHOR_NAME.split(" ");
const SURNAMES = rest.join(" ");

const BUTTON =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors";

/**
 * Who made the site, where its code lives and the tip jar, as one card: the
 * author's mark and name linking to the portfolio, then two buttons.
 *
 * Shared by the content footer, `/informacio` and the map's settings panel, so
 * the credit looks the same wherever it appears. No hooks, so the client-side
 * settings panel can render it too. `compact` stacks it for narrow columns.
 */
export const AuthorCard = ({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) => (
  <div
    className={cn(
      "border-border bg-muted/30 flex flex-col gap-4 rounded-xl border p-4",
      !compact && "sm:flex-row sm:items-center sm:justify-between",
      className,
    )}
  >
    <a
      href={PORTFOLIO_URL}
      target="_blank"
      rel="noopener"
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-lg",
        FOCUS_RING,
      )}
    >
      {/* Joel's mark, served by his portfolio rather than copied here, so
          it changes when the portfolio's does. A plain <img>: next/image
          would need the host allow-listed in next.config to resize a 44px
          icon the portfolio already serves at 192. The hairline is the
          portfolio's own treatment; the tile is near-black in both themes
          and would melt into the dark card without it. Decorative: the
          link's text already names him. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${PORTFOLIO_URL}/icon/192`}
        alt=""
        width={44}
        height={44}
        loading="lazy"
        decoding="async"
        className="ring-border size-11 shrink-0 rounded-[10px] ring-1"
      />
      <span className="min-w-0">
        <span className="text-muted-foreground block text-sm">fet per</span>
        {/* Set as the portfolio sets it: "joel" carries the weight, the
            surnames step back in colour, never in size. */}
        <span className="flex items-center gap-1 text-base group-hover:underline group-hover:underline-offset-4">
          <span>
            <span className="font-semibold">{FIRST_NAME}</span>{" "}
            <span className="text-muted-foreground">{SURNAMES}</span>
          </span>
          <ArrowUpRight size={16} aria-hidden className="shrink-0" />
        </span>
      </span>
      <NewTab />
    </a>
    {/* Labels never break: in the narrow settings sheet the second button
        moves to its own row instead, and both stretch to the full width. */}
    <div className={cn("flex flex-wrap gap-2", compact && "[&>a]:flex-1")}>
      <a
        href={KO_FI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          BUTTON,
          "bg-foreground text-background hover:opacity-90",
          FOCUS_RING,
        )}
      >
        <Coffee size={16} aria-hidden className="shrink-0" />
        fes una donació
        <NewTab />
      </a>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          BUTTON,
          "border-border hover:bg-muted border",
          FOCUS_RING,
        )}
      >
        <GithubMark className="size-4 shrink-0" />
        {/* "github" on screen; the code is what a screen reader is told it
            leads to, with the visible word kept in the name. */}
        <span className="sr-only">el codi a </span>
        github
        <NewTab />
      </a>
    </div>
  </div>
);
