// Plain TypeScript (no React, no path aliases, erasable syntax only) so it can
// be unit-tested directly with `node --test`.

/** Minimum query length that is searched (single letters match everything). */
export const MIN_QUERY_LENGTH = 2;

const MARKS = /\p{M}/gu;
const WHITESPACE = /\s/u;

/**
 * Folds one character for searching: lower-cased, accents removed, ligatures
 * and compatibility forms expanded ("ﬁ" → "fi"), any whitespace → one space.
 * May return "" (a lone combining mark) or several characters.
 */
function foldChar(char: string): string {
  if (WHITESPACE.test(char)) return " ";
  return char.toLowerCase().normalize("NFKD").replace(MARKS, "");
}

/** Folded text plus, for each folded character, where it came from. */
export type FoldedText = {
  text: string;
  /** Original index where folded char i starts. */
  starts: number[];
  /** Original index where folded char i ends (exclusive). */
  ends: number[];
};

/** Fast fold without position maps (used to search whole books). */
export function foldPlain(original: string): string {
  let out = "";
  let lastWasSpace = false;
  for (const char of original) {
    const folded = foldChar(char);
    for (const c of folded) {
      if (c === " ") {
        if (lastWasSpace) continue;
        lastWasSpace = true;
      } else {
        lastWasSpace = false;
      }
      out += c;
    }
  }
  return out;
}

/** Same transform as `foldPlain`, but remembers original positions (for snippets/highlights). */
export function foldWithMap(original: string): FoldedText {
  let text = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let lastWasSpace = false;
  let index = 0;
  for (const char of original) {
    const start = index;
    const end = index + char.length;
    index = end;
    for (const c of foldChar(char)) {
      if (c === " ") {
        if (lastWasSpace) continue;
        lastWasSpace = true;
      } else {
        lastWasSpace = false;
      }
      text += c;
      starts.push(start);
      ends.push(end);
    }
  }
  return { text, starts, ends };
}

/** Folds a user's query the same way pages are folded. */
export function foldQuery(query: string): string {
  return foldPlain(query).trim();
}
