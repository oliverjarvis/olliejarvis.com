#!/usr/bin/env node
/**
 * Parses grammar point markdown files from scrape_data/ and:
 * 1. Generates a TypeScript grammar database
 * 2. Validates detection markers against example sentences
 * 3. Reports grammar points whose markers DON'T appear in their own examples
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

const SCRAPE_DIR = join(process.cwd(), "scrape_data");
const OUTPUT = join(process.cwd(), "src/app/nihongo/data/grammar-points-db.ts");

// ── Parsing ─────────────────────────────────────────────────

function parseFile(filepath) {
  const content = readFileSync(filepath, "utf-8");
  const lines = content.split("\n");

  const fnMatch = filepath.match(/lesson_(\d+)/);
  const id = fnMatch ? parseInt(fnMatch[1]) : 0;

  // Extract BunPro URL
  let url = "";
  for (const line of lines) {
    const urlMatch = line.match(/\*\*URL:\*\*\s*(https:\/\/bunpro\.jp\S+)/);
    if (urlMatch) {
      url = urlMatch[1];
      break;
    }
  }

  // Find JLPT level: "N[1-5] Lesson" or "Non-JLPT Lesson"
  let jlptLevel = 0;
  let jlptLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const nMatch = lines[i].match(/^N([1-5])\s+Lesson/);
    if (nMatch) {
      jlptLevel = parseInt(nMatch[1]);
      jlptLineIdx = i;
      break;
    }
    if (lines[i].match(/^Non-JLPT\s+Lesson/)) {
      jlptLevel = 0;
      jlptLineIdx = i;
      break;
    }
  }
  if (jlptLineIdx === -1) return null;

  // Grammar point name: next non-empty line after JLPT line
  let name = "";
  let nameLineIdx = -1;
  for (let i = jlptLineIdx + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t && !t.startsWith("Grammar")) {
      name = t;
      nameLineIdx = i;
      break;
    }
  }
  if (!name) return null;

  // English meaning: next non-empty line after name
  let meaning = "";
  for (let i = nameLineIdx + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t) {
      if (t.startsWith("#") || t === "Structure" || t === "Details") break;
      meaning = t;
      break;
    }
  }

  // Extract example sentences
  const examples = extractExamples(lines);

  // Extract detection markers
  const markers = extractMarkers(name);

  return { id, name, meaning, jlptLevel, markers, examples, url };
}

function extractExamples(lines) {
  const examples = [];
  let inExamples = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "## Examples") {
      inExamples = true;
      continue;
    }
    if (!inExamples) continue;
    if (lines[i].trim().startsWith("## ")) break;

    const t = lines[i].trim();
    if (!t) continue;
    if (t === "Examples" || t === "Sentence" || t === "Translation" || /^\d{2}:\d{2}$/.test(t)) continue;

    // Lines with Japanese characters that aren't pure English
    if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(t) && !/^[A-Z("]/.test(t)) {
      examples.push(t);
    }
  }
  return examples;
}

function extractMarkers(name) {
  const markers = new Set();
  let cleaned = name.replace(/^[～~]+/, "").trim();

  // Remove numbered variant suffixes: ①②③ etc.
  cleaned = cleaned.replace(/[①②③④⑤⑥⑦⑧⑨⑩]+/g, "").trim();

  // Split on ・ or /
  const parts = cleaned.split(/[・\/]/);

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    // Extract from bracket notation: Verb[れる] → れる
    const brackets = part.match(/\[([^\]]+)\]/g);
    if (brackets) {
      for (const b of brackets) {
        const inner = b.slice(1, -1);
        if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(inner)) {
          markers.add(inner);
        }
      }
    }

    // Strip English annotations
    let jp = part
      .replace(/Verb/gi, "")
      .replace(/Noun/gi, "")
      .replace(/Adjective/gi, "")
      .replace(/Phrase/gi, "")
      .replace(/Number/gi, "")
      .replace(/Counter/gi, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/[+～~]/g, "")
      .replace(/\s+/g, "")
      .trim();

    if (!jp) continue;

    // Split on 〜 and ～ to get individual parts (e.g., たとえ〜ても → たとえ, ても)
    const tildeParts = jp.split(/[〜～]/).filter(Boolean);
    for (const tp of tildeParts) {
      addJapaneseMarkers(tp, markers);
    }

    // Also add the full joined form
    if (tildeParts.length > 1) {
      const joined = tildeParts.join("");
      if (joined.length > 0) addJapaneseMarkers(joined, markers);
    }

    // For patterns with inline furigana like と言いう事こと, also try
    // splitting individual kanji+reading groups as separate markers
    // e.g., "と言いう事こと" → "ということ" (kana-only), "と言う事" (kanji-only)
    if (/[\u4e00-\u9fff]/.test(jp) && /[\u3040-\u309f]/.test(jp)) {
      // Build kanji-with-okurigana version: strip inline readings
      // Pattern: kanji block + hiragana reading → keep just kanji
      // Then remaining hiragana is particles/okurigana
      // This is imperfect but catches common cases
    }
  }

  return [...markers].filter((m) => m.length > 0);
}

function addJapaneseMarkers(text, markers) {
  if (!/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(text)) return;

  markers.add(text);

  // For kanji+kana combos with inline furigana, extract kana-only version
  // e.g., 段々だんだん → だんだん, 遂ついに → ついに
  const hasKanji = /[\u4e00-\u9fff]/.test(text);
  const hasKana = /[\u3040-\u309f]/.test(text);

  if (hasKanji && hasKana) {
    // Extract kana-only
    const kanaOnly = text.replace(/[\u4e00-\u9fff]/g, "");
    if (kanaOnly.length >= 2) markers.add(kanaOnly);

    // Extract kanji-only (for compound kanji like 段々, 命令形)
    const kanjiOnly = text.replace(/[\u3040-\u309f\u30a0-\u30ff]/g, "");
    if (kanjiOnly.length >= 2) markers.add(kanjiOnly);

    // Try to reconstruct kanji+okurigana without furigana
    // Heuristic: for patterns like 込こむ, the kanji is 込 and む is okurigana
    // This handles simple cases — complex ones will be caught by kana-only matching
  }
}

// ── Parse all files ─────────────────────────────────────────

const files = readdirSync(SCRAPE_DIR)
  .filter((f) => f.endsWith(".md") && f.startsWith("lesson_"))
  .sort();

const grammarPoints = [];
const parseFailures = [];

for (const file of files) {
  const result = parseFile(join(SCRAPE_DIR, file));
  if (result && result.markers.length > 0) {
    grammarPoints.push(result);
  } else if (result && result.markers.length === 0) {
    parseFailures.push({ file, name: result?.name, reason: "no markers" });
  } else {
    parseFailures.push({ file, reason: "parse failed" });
  }
}

grammarPoints.sort((a, b) => a.id - b.id);

// ── Validate markers against examples ───────────────────────

console.log("\n=== VALIDATION ===\n");

const gaps = [];
const noExamples = [];

for (const gp of grammarPoints) {
  if (gp.examples.length === 0) {
    noExamples.push(gp);
    continue;
  }

  const allText = gp.examples.join(" ");
  const found = gp.markers.some((marker) => allText.includes(marker));

  if (!found) {
    gaps.push(gp);
  }
}

const covered = grammarPoints.length - gaps.length - noExamples.length;
console.log(`Total: ${grammarPoints.length} | Covered: ${covered} (${Math.round(covered / grammarPoints.length * 100)}%) | Gaps: ${gaps.length} | No examples: ${noExamples.length}`);

if (gaps.length > 0) {
  console.log(`\n--- ${gaps.length} GAPS ---\n`);

  // Categorize gaps
  const categories = {
    "Verb/Adj class (morphological)": [],
    "Numbered variants": [],
    "Other": [],
  };

  for (const gp of gaps) {
    if (/[るう]-Verb|い-Adj|な-Adj|Verb \(/.test(gp.name) || /他動詞|自動詞|連用形|命令形|させられる/.test(gp.name)) {
      categories["Verb/Adj class (morphological)"].push(gp);
    } else if (/[①②③]/.test(gp.name) || /\s[12]$/.test(gp.name)) {
      categories["Numbered variants"].push(gp);
    } else {
      categories["Other"].push(gp);
    }
  }

  for (const [cat, items] of Object.entries(categories)) {
    if (items.length === 0) continue;
    console.log(`  ${cat} (${items.length}):`);
    for (const gp of items) {
      console.log(`    #${gp.id} "${gp.name}" markers:[${gp.markers.join(",")}]`);
    }
  }
}

if (parseFailures.length > 0) {
  console.log(`\n--- Parse failures: ${parseFailures.length} ---`);
  for (const f of parseFailures) {
    console.log(`  ${f.file}: ${f.reason}${f.name ? ` ("${f.name}")` : ""}`);
  }
}

console.log("\n=== JLPT Distribution ===");
for (const level of [5, 4, 3, 2, 1, 0]) {
  const count = grammarPoints.filter((g) => g.jlptLevel === level).length;
  if (count > 0) console.log(`  N${level || "on-JLPT"}: ${count}`);
}

// ── Generate TypeScript ─────────────────────────────────────

const tsLines = [
  "// Auto-generated from scrape_data/ — do not edit manually",
  "// Re-generate: node scripts/parse-grammar.mjs",
  "",
  "export interface GrammarPointDef {",
  "  id: number;",
  "  name: string;",
  "  meaning: string;",
  "  jlptLevel: number; // 5=N5 .. 1=N1, 0=non-JLPT",
  "  markers: string[];",
  "  url: string;",
  "}",
  "",
  "export const GRAMMAR_POINTS: GrammarPointDef[] = [",
];

for (const gp of grammarPoints) {
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const markers = gp.markers.map((m) => `"${esc(m)}"`).join(", ");
  tsLines.push(
    `  { id: ${gp.id}, name: "${esc(gp.name)}", meaning: "${esc(gp.meaning)}", jlptLevel: ${gp.jlptLevel}, markers: [${markers}], url: "${esc(gp.url || "")}" },`,
  );
}

tsLines.push("];");
tsLines.push("");
tsLines.push("// Marker → grammar point IDs lookup");
tsLines.push("export const MARKER_TO_IDS: Record<string, number[]> = {};");
tsLines.push("for (const gp of GRAMMAR_POINTS) {");
tsLines.push("  for (const m of gp.markers) {");
tsLines.push("    if (!MARKER_TO_IDS[m]) MARKER_TO_IDS[m] = [];");
tsLines.push("    MARKER_TO_IDS[m].push(gp.id);");
tsLines.push("  }");
tsLines.push("}");
tsLines.push("");
tsLines.push("// ID lookup");
tsLines.push("export const GP_BY_ID: Record<number, GrammarPointDef> = {};");
tsLines.push("for (const gp of GRAMMAR_POINTS) GP_BY_ID[gp.id] = gp;");
tsLines.push("");

writeFileSync(OUTPUT, tsLines.join("\n"));
console.log(`\nGenerated ${grammarPoints.length} grammar points → ${OUTPUT}`);
