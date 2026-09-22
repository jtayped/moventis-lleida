/** Where a code sits on the numeric scale; anything unnumbered sorts to the end. */
const rank = (code: string): number => {
  const n = parseInt(code, 10);
  return isNaN(n) ? Infinity : n;
};

/**
 * Line codes sort numerically, not lexically: the network has lines 1 through
 * 14, and a string sort puts 10 between 1 and 2.
 *
 * Night lines (`n1` and friends) have no place on that scale, so they sort to
 * the end and fall back to a string compare among themselves.
 *
 * The comparison is `<` rather than a subtraction on purpose. Two unnumbered
 * codes both rank `Infinity`, and `Infinity - Infinity` is `NaN` — which is not
 * `0`, so a subtracting comparator returns `NaN` to `Array#sort` and the order
 * becomes implementation-defined.
 */
export const compareLineCodes = (a: string, b: string): number => {
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  return a.localeCompare(b);
};

/** The same order, for anything carrying its code on a `code` field. */
export const compareByLineCode = <T extends { code: string }>(a: T, b: T) =>
  compareLineCodes(a.code, b.code);
