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
