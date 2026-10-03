/**
 * Which live prediction at a stop is the bus a plan boards?
 *
 * Moventis lists the next few arrivals per journey at a stop, live or
 * scheduled, with no trip id; the plan knows the timetabled departure it
 * boards, and the timetable knows every other departure of that journey at
 * that stop. So the two lists are aligned in order (buses on one journey do
 * not overtake) at the least total deviation, and the live entry aligned with
 * the plan's departure is its prediction.
 *
 * Least total deviation, not greedy: with departures at 10:00 and 10:15 and a
 * live 10:16, a greedy pass would give 10:16 to the 10:00 bus (16 min late,
 * within bounds) and leave the 10:15 one without a prediction. When the 10:00
 * bus has already gone, the listing no longer carries it, and 10:16 is the
 * 10:15 one a minute late.
 */

/** A prediction this much earlier than its timetabled time is still that bus. */
export const LIVE_EARLY_S = 2 * 60;
/** ...and this much later. */
export const LIVE_LATE_S = 20 * 60;
/**
 * Leaving a live entry unexplained costs more than any match it could have
 * made, so every listed bus that fits a departure is matched to one. At 10
 * min, dropping was cheaper than a match more than 10 min late: on a Saturday
 * evening line 2's 20:10 from its terminal, listed at 20:26, was read as gone
 * and left out of every plan.
 */
const UNMATCHED_LIVE_S = LIVE_LATE_S + 10 * 60;

const fits = (scheduled: number, live: number) =>
  live - scheduled >= -LIVE_EARLY_S && live - scheduled <= LIVE_LATE_S;

/**
 * For each live time, the index of the scheduled time it is (or −1). Both
 * lists ascending, in seconds on one footing. Scheduled times with no live
 * counterpart (already gone, or past the listing's horizon) cost nothing.
 */
export function alignLive(scheduled: number[], live: number[]): number[] {
  const S = scheduled.length;
  const L = live.length;
  const cost = Array.from({ length: S + 1 }, () =>
    new Array<number>(L + 1).fill(Infinity),
  );
  const move = Array.from({ length: S + 1 }, () =>
    new Array<"skip" | "drop" | "match" | null>(L + 1).fill(null),
  );
  cost[0]![0] = 0;
  for (let i = 0; i <= S; i++) {
    for (let j = 0; j <= L; j++) {
      const here = cost[i]![j]!;
      if (here === Infinity) continue;
      if (i < S && here < cost[i + 1]![j]!) {
        cost[i + 1]![j] = here;
        move[i + 1]![j] = "skip";
      }
      if (j < L && here + UNMATCHED_LIVE_S < cost[i]![j + 1]!) {
        cost[i]![j + 1] = here + UNMATCHED_LIVE_S;
        move[i]![j + 1] = "drop";
      }
      if (i < S && j < L && fits(scheduled[i]!, live[j]!)) {
        const c = here + Math.abs(live[j]! - scheduled[i]!);
        if (c < cost[i + 1]![j + 1]!) {
          cost[i + 1]![j + 1] = c;
          move[i + 1]![j + 1] = "match";
        }
      }
    }
  }

  const matched = new Array<number>(L).fill(-1);
  let i = S;
  let j = L;
  while (i > 0 || j > 0) {
    const m = move[i]![j];
    if (m === "match") {
      matched[j - 1] = i - 1;
      i--;
      j--;
    } else if (m === "drop") j--;
    else i--;
  }
  return matched;
}
