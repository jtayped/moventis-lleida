import { primaryTrayectoId, type MoventisTrayecto } from "./api.js";

/**
 * Turning a pile of date probes into "this line runs on these days" / "it is
 * dormant" / "it is gone" / "we couldn't tell" is the judgement that decides
 * whether the sync deletes anything. It is kept pure here, with the fetching
 * left in `discovery.ts`, so every branch can be tested without the network.
 */

/** One date's probe. `trayectos: null` means the request failed outright. */
export interface Probe {
  date: string;
  trayectos: MoventisTrayecto[] | null;
}

export interface ProbeSummary {
  /** Dates that came back carrying real service. */
  operatingDates: string[];
  /** Deduplicated trayectos across those dates. */
  trayectos: MoventisTrayecto[];
  /** False when any probe in the batch errored. */
  allAnswered: boolean;
}

export type LineOutcome =
  | {
      status: "resolved";
      operatingDates: string[];
      calendarProbed: boolean;
      trayectos: MoventisTrayecto[];
    }
  | { status: "withdrawn" }
  | { status: "unreachable" };

/** The branch of {@link LineOutcome} that carries a calendar. */
export type ResolvedOutcome = Extract<LineOutcome, { status: "resolved" }>;

/** Collapse trayectos from several dates into one set, keyed by primary id. */
export function dedupeTrayectos(
  batches: readonly MoventisTrayecto[][],
): MoventisTrayecto[] {
  const unique = new Map<number, MoventisTrayecto>();
  for (const batch of batches) {
    for (const t of batch) {
      const id = primaryTrayectoId(t);
      if (id != null && !unique.has(id)) unique.set(id, t);
    }
  }
  return [...unique.values()];
}

export function summarizeProbes(probes: readonly Probe[]): ProbeSummary {
  const serving = probes.filter((p) => p.trayectos && p.trayectos.length > 0);
  return {
    operatingDates: serving.map((p) => p.date),
    trayectos: dedupeTrayectos(serving.map((p) => p.trayectos!)),
    allAnswered: probes.every((p) => p.trayectos !== null),
  };
}

/** True when the batch found at least one day of real service. */
export function hasService(summary: ProbeSummary): boolean {
  return summary.operatingDates.length > 0;
}

/** Outcome for a line that is running in the near horizon. */
export function runningOutcome(near: ProbeSummary): ResolvedOutcome {
  return {
    status: "resolved",
    operatingDates: near.operatingDates,
    calendarProbed: near.allAnswered,
    trayectos: near.trayectos,
  };
}

/**
 * Outcome for a line with no service in the near horizon, given a sparse scan
 * further ahead.
 *
 * Service returning later means the line is merely dormant — it keeps its stops,
 * geometry and route row, but reports an empty calendar so the line strip stops
 * claiming it runs today. Silence everywhere means it is withdrawn, which
 * pruning may act on. Silence that includes a failed request means we do not
 * know, and the run must not delete on the strength of it.
 */
export function dormantOutcome(
  near: ProbeSummary,
  far: ProbeSummary,
): LineOutcome {
  if (hasService(far)) {
    return {
      status: "resolved",
      operatingDates: [],
      calendarProbed: near.allAnswered,
      trayectos: far.trayectos,
    };
  }

  return near.allAnswered && far.allAnswered
    ? { status: "withdrawn" }
    : { status: "unreachable" };
}
