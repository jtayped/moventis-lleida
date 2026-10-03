import { FOCUS_RING } from "@/components/content/styles";
import { cn } from "@/lib/utils";
import {
  AUTHOR_NAME,
  GITHUB_URL,
  KO_FI_URL,
  PORTFOLIO_URL,
} from "@/lib/project-links";

const LINK = cn(
  "text-foreground rounded-sm underline underline-offset-4",
  FOCUS_RING,
);

/**
 * Who made the site, where its code lives, and the tip jar, as one sentence.
 *
 * Shared by the content footer and the settings panel, so the credit reads the
 * same wherever it appears. No hooks, so a client component can render it too.
 */
export const AuthorCredit = ({ className }: { className?: string }) => (
  <p className={className}>
    fet per{" "}
    <a href={PORTFOLIO_URL} target="_blank" rel="noopener" className={LINK}>
      {AUTHOR_NAME}
    </a>
    . el codi és a{" "}
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK}
    >
      github
    </a>
    , i si et fa servei, pots{" "}
    <a
      href={KO_FI_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK}
    >
      fer una donació
    </a>
    .
  </p>
);
