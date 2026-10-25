import type { Fare } from "@/i18n/copy/fares";
import { slugify } from "@/lib/stops";

/**
 * Each fare under its own heading, with an anchor: card names ("t-jove",
 * "t-nostra") are what people search for, and a heading is what a search
 * engine matches a query against and can link to.
 */
export const FareList = ({ fares }: { fares: Fare[] }) => (
  <ul className="border-border divide-border divide-y rounded-xl border">
    {fares.map((fare) => (
      <li
        key={fare.name}
        id={slugify(fare.name)}
        className="grid scroll-mt-6 grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 p-4"
      >
        <h3 className="text-sm font-semibold">{fare.name}</h3>
        <p className="text-sm font-semibold tabular-nums">{fare.price}</p>
        <p className="text-muted-foreground col-span-2 text-sm leading-relaxed">
          {fare.detail}
        </p>
      </li>
    ))}
  </ul>
);
