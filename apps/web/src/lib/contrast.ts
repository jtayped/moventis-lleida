function sRGBToLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Line colours come straight from Moventis with no validation, so this has to
 * survive anything: `#fff`, `groc`, an empty string. Shorthand is expanded, and
 * anything that isn't a hex colour falls back to dark text — on the light card
 * and the light badge these sit on, unreadable dark beats invisible white.
 */
function normalizeHex(hex: string): string | null {
  const value = hex.trim().replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (/^[0-9a-fA-F]{6}$/.test(value)) return value;

  // 8-digit (#rrggbbaa): the alpha says nothing about the text on top of it.
  if (/^[0-9a-fA-F]{8}$/.test(value)) return value.slice(0, 6);

  return null;
}

export function getContrastTextColor(
  hex: string | undefined | null,
): "#111111" | "#ffffff" {
  const normalized = hex ? normalizeHex(hex) : null;
  if (!normalized) return "#111111";

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const luminance =
    0.2126 * sRGBToLinear(r) +
    0.7152 * sRGBToLinear(g) +
    0.0722 * sRGBToLinear(b);
  return luminance > 0.179 ? "#111111" : "#ffffff";
}

/** Relative luminance of a normalised `rrggbb`. */
function luminanceOf(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) =>
    sRGBToLinear(parseInt(hex.slice(i, i + 2), 16) / 255),
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** `rrggbb` moved `t` of the way towards `target` (`rrggbb`). */
function mixHex(hex: string, target: string, t: number): string {
  return [0, 2, 4]
    .map((i) => {
      const from = parseInt(hex.slice(i, i + 2), 16);
      const to = parseInt(target.slice(i, i + 2), 16);
      return Math.round(from + (to - from) * t)
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
}

/**
 * WCAG 1.4.11 asks 3:1 of any graphic that carries meaning. Measured against
 * each theme's `muted` surface, not the page background: the drawings sit on
 * both, and `muted` is the one closer to mid-grey, so passing there passes on
 * the page too.
 */
const MIN_GRAPHIC_CONTRAST = 3;
const LIGHT_SURFACE = "f3f5f9";
const DARK_SURFACE = "252629";

/**
 * The line colour, darkened (`towards` black) or lightened (white) in 5% steps
 * until it reaches 3:1 on `surface`. Colours that already pass come back as
 * they are, so most lines keep their exact Moventis colour.
 */
function accentOn(hex: string, surface: string, towards: string): string {
  for (let step = 0; step <= 20; step++) {
    const candidate = mixHex(hex, towards, step / 20);
    if (contrastRatio(candidate, surface) >= MIN_GRAPHIC_CONTRAST) {
      return `#${candidate}`;
    }
  }
  return `#${towards}`;
}

/**
 * CSS variables for drawing in a line's colour: `--line-light` and
 * `--line-dark`, each the line colour adjusted to stay visible on that theme.
 * Line 1's yellow is 1.07:1 on the light page and line 9's near-black is
 * 1.02:1 on the dark one; both would draw invisible rails and bars.
 *
 * Pair with {@link LINE_ACCENT_CLASS} and draw with `var(--line)`. The badge
 * keeps the true colour: its code is text, already handled by
 * {@link getContrastTextColor}.
 */
export function lineAccentStyle(color: string): Record<string, string> {
  const hex = normalizeHex(color) ?? "888888";
  return {
    "--line-light": accentOn(hex, LIGHT_SURFACE, "000000"),
    "--line-dark": accentOn(hex, DARK_SURFACE, "ffffff"),
  };
}

/** Points `--line` at the variant for the active theme. */
export const LINE_ACCENT_CLASS =
  "[--line:var(--line-light)] dark:[--line:var(--line-dark)]";
