import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Read a fixture JSON file from this directory as `unknown` (the parser's input). */
export function loadFixture(name: string): unknown {
  const url = new URL(`./${name}`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as unknown;
}
