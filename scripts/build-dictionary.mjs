#!/usr/bin/env node
/**
 * Builds a compact dictionary from JMdict-simplified for:
 * 1. Compound word recognition (post-Kuromoji merge)
 * 2. Word definitions for the journal
 * 3. JLPT-level tagging (from community data)
 *
 * Input: data/jmdict-eng-common-3.6.2.json (CC-BY-SA, from JMdict project)
 * Output: src/app/nihongo/data/dictionary.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const INPUT = join(process.cwd(), "data/jmdict-eng-common-3.6.2.json");
const OUTPUT = join(process.cwd(), "src/app/nihongo/data/dictionary.ts");

const raw = JSON.parse(readFileSync(INPUT, "utf-8"));
const words = raw.words;

console.log(`Processing ${words.length} JMdict entries...`);

// Build dictionary: kanji/kana → { reading, meaning, pos }
// For compound merging, we need multi-character entries
const dict = new Map();

for (const entry of words) {
  const kanji = entry.kanji?.map((k) => k.text) || [];
  const kana = entry.kana?.map((k) => k.text) || [];
  const senses = entry.sense || [];

  // Get the primary meaning (first English gloss of first sense)
  let meaning = "";
  let pos = "";
  if (senses.length > 0) {
    const s = senses[0];
    meaning = (s.gloss || [])
      .filter((g) => g.lang === "eng" || !g.lang)
      .map((g) => g.text)
      .slice(0, 3)
      .join("; ");
    pos = (s.partOfSpeech || []).join(", ");
  }

  if (!meaning) continue;

  // Get primary reading
  const primaryReading = kana[0] || "";

  // Add kanji forms
  for (const k of kanji) {
    if (!dict.has(k)) {
      dict.set(k, {
        reading: primaryReading,
        meaning,
        pos,
      });
    }
  }

  // Add kana-only forms (for words without kanji)
  if (kanji.length === 0) {
    for (const k of kana) {
      if (!dict.has(k)) {
        dict.set(k, {
          reading: k,
          meaning,
          pos,
        });
      }
    }
  }
}

console.log(`Built ${dict.size} dictionary entries`);

// Stats
let multiChar = 0;
let singleChar = 0;
for (const [key] of dict) {
  if (key.length >= 2) multiChar++;
  else singleChar++;
}
console.log(`  Single-char: ${singleChar}`);
console.log(`  Multi-char (compounds): ${multiChar}`);

// Generate TypeScript file
// We'll output a JSON object for the dictionary lookup
// and a Set of compound words for the re-merger

const lines = [
  '// Auto-generated from JMdict (CC-BY-SA) by scripts/build-dictionary.mjs',
  '// Source: https://github.com/scriptin/jmdict-simplified',
  '// Do not edit manually.',
  '',
  'export interface DictEntry {',
  '  r: string; // reading (hiragana)',
  '  m: string; // meaning (English, up to 3 glosses)',
  '  p: string; // part of speech',
  '}',
  '',
  '// Full dictionary lookup: word → entry',
  `// ${dict.size} entries from JMdict common words`,
  'export const DICT: Record<string, DictEntry> = {',
];

// Sort entries for deterministic output
const sorted = [...dict.entries()].sort((a, b) => a[0].localeCompare(b[0]));

for (const [key, val] of sorted) {
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  lines.push(
    `  "${esc(key)}": { r: "${esc(val.reading)}", m: "${esc(val.meaning)}", p: "${esc(val.pos)}" },`,
  );
}

lines.push("};");
lines.push("");

// Build compound set (multi-char words for the re-merger)
lines.push("// Compound words (2+ chars) for post-Kuromoji merge validation");
lines.push(`// ${multiChar} entries`);
lines.push("export const COMPOUNDS = new Set<string>([");

for (const [key] of sorted) {
  if (key.length >= 2) {
    const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`  "${esc(key)}",`);
  }
}

lines.push("]);");
lines.push("");

// Helper function
lines.push("export function lookupWord(word: string): DictEntry | undefined {");
lines.push("  return DICT[word];");
lines.push("}");
lines.push("");
lines.push("export function isCompound(word: string): boolean {");
lines.push("  return COMPOUNDS.has(word);");
lines.push("}");
lines.push("");

writeFileSync(OUTPUT, lines.join("\n"));

const fileSizeKB = Math.round(
  readFileSync(OUTPUT).length / 1024,
);
console.log(`\nGenerated ${OUTPUT} (${fileSizeKB} KB)`);
