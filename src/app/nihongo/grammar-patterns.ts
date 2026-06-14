import { GrammarPatternEntry, KuromojiToken } from "./types";

const STORAGE_KEY = "nihongo-grammar-patterns";

export function getGrammarPatterns(): Record<string, GrammarPatternEntry> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveGrammarPatterns(
  patterns: Record<string, GrammarPatternEntry>,
): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
}

/**
 * Extract grammar patterns from tokenized text.
 * Looks at grammar_note fields on merged tokens.
 */
export function recordGrammarPatterns(tokens: KuromojiToken[]): void {
  const patterns = getGrammarPatterns();
  const now = Date.now();

  for (const token of tokens) {
    if (!token.grammar_note) continue;

    const notes = token.grammar_note.split(", ");
    for (const note of notes) {
      const key = note.trim().toLowerCase();
      if (!key) continue;

      if (patterns[key]) {
        patterns[key].encounterCount += 1;
      } else {
        patterns[key] = {
          pattern: note.trim(),
          encounterCount: 1,
          firstSeen: now,
        };
      }
    }
  }

  saveGrammarPatterns(patterns);
}

export function getPatternList(): string[] {
  const patterns = getGrammarPatterns();
  return Object.values(patterns)
    .sort((a, b) => b.encounterCount - a.encounterCount)
    .map((p) => p.pattern);
}
