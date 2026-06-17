/**
 * Applied to the uppercase form of names to fix missing or wrong diacritics.
 * Corrections run before title-casing so `capitalize()` propagates them correctly.
 */
const CORRECTIONS: [RegExp, string][] = [
  [/\bAGRONOMS\b/g, "AGRÒNOMS"],
  [/\bJARDI\b/g, "JARDÍ"],
  [/\bCAMI\b/g, "CAMÍ"],
  [/\bBALAFIA\b/g, "BALÀFIA"],
  [/\bLLIVIA\b/g, "LLÍVIA"],
  [/\bTURISTIC\b/g, "TURÍSTIC"],
  [/\bPOLIGONS\b/g, "POLÍGONS"],
  [/\bATLESTISME\b/g, "ATLETISME"], // API typo
  [/\bALBAGES\b/g, "ALBAGÉS"],
  [/\bALCARRAS\b/g, "ALCARRÀS"],
  [/\bJOAN ORO\b/g, "JOAN ORÓ"],
  [/\bBARO\b/g, "BARÓ"],
];

// Articles and prepositions kept lowercase when not at the start of the string
const SMALL_WORDS = new Set([
  "a",
  "al",
  "d",
  "de",
  "del",
  "els",
  "el",
  "en",
  "i",
  "l",
  "la",
  "les",
  "per",
  "un",
  "una",
]);

function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCase(s: string): string {
  return s
    .split(" ")
    .map((word, idx) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      if (idx > 0 && SMALL_WORDS.has(lower)) return lower;
      return capitalize(word);
    })
    .join(" ");
}

export function normalizeName(raw: string): string {
  let s = raw
    // Various quote-like chars used as apostrophe in the API
    .replace(/[`´]/g, "'")
    // Underscore is used as a space in some stop names
    .replace(/_/g, " ")
    // Uppercase for the correction pass
    .toUpperCase();

  for (const [pattern, replacement] of CORRECTIONS) {
    s = s.replace(pattern, replacement);
  }

  // Add spaces around hyphens that are between word characters
  s = s.replace(/([^\s])-([^\s])/g, "$1 - $2");
  // Normalise slashes: ensure exactly one space on each side
  s = s.replace(/\s*\/\s*/g, " / ");
  // Collapse runs of whitespace
  s = s.replace(/\s+/g, " ").trim();

  return titleCase(s);
}

/**
 * Maps Moventis COD_LINEA values to the canonical code used in this app.
 * Lowercases by default; remaps known special cases (22 → n1, BT → bt).
 */
export function normalizeLineCode(code: string): string {
  if (code === "22") return "n1";
  return code.toLowerCase();
}
