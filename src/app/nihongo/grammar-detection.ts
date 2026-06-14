/**
 * Two-stage grammar point detection:
 * 1. Cheap candidate filter: scans text + tokens for marker matches → ~30-50 candidates
 * 2. LLM confirmation: sends sentence + candidates to Claude → confirmed grammar points
 */

import { KuromojiToken } from "./types";
import { GRAMMAR_POINTS, GP_BY_ID, GrammarPointDef } from "./data/grammar-points-db";

// ── Stage 1: Candidate filter ───────────────────────────────

/**
 * Fast scan of text and tokens to find grammar point candidates.
 * Intentionally over-matches (high recall, low precision).
 * The LLM stage filters false positives.
 */
export function findCandidates(
  text: string,
  tokens: KuromojiToken[],
): GrammarPointDef[] {
  const candidateIds = new Set<number>();

  // Build token lookup sets
  const basicForms = new Set<string>();
  const surfaceForms = new Set<string>();
  const posTypes = new Set<string>();

  for (const t of tokens) {
    if (t.basic_form && t.basic_form !== "*") basicForms.add(t.basic_form);
    surfaceForms.add(t.surface_form);
    posTypes.add(t.pos);
  }

  for (const gp of GRAMMAR_POINTS) {
    // Check each marker
    for (const marker of gp.markers) {
      if (marker.length === 0) continue;

      // Single-character markers: require token match (avoid false positives from substrings)
      if (marker.length === 1) {
        if (basicForms.has(marker) || surfaceForms.has(marker)) {
          candidateIds.add(gp.id);
          break;
        }
        continue;
      }

      // Multi-character markers: check text substring AND token forms
      if (
        text.includes(marker) ||
        basicForms.has(marker) ||
        surfaceForms.has(marker)
      ) {
        candidateIds.add(gp.id);
        break;
      }
    }
  }

  // Also add morphological candidates based on token POS
  // These cover the verb/adjective class grammar points that can't be text-matched
  for (const t of tokens) {
    // い-adjectives (various grammar points about い-adj usage)
    if (t.pos === "形容詞") {
      for (const id of [10, 38, 40, 51, 65]) {
        candidateIds.add(id);
      }
    }
    // な-adjectives
    if (t.pos === "形容動詞" || (t.pos === "名詞" && t.pos_detail_1 === "形容動詞語幹")) {
      for (const id of [11, 41, 66]) {
        candidateIds.add(id);
      }
    }
    // Verb conjugation classes
    if (t.pos === "動詞") {
      // る-verbs and う-verbs
      if (t.pos_detail_1 === "自立") {
        candidateIds.add(16); // る-verb dictionary
        candidateIds.add(17); // う-verb dictionary
      }
    }
    // Passive/potential (れる/られる)
    if (t.pos === "動詞" && (t.basic_form === "れる" || t.basic_form === "られる")) {
      candidateIds.add(142); // passive
      candidateIds.add(260); // potential
    }
    // Causative
    if (t.pos === "動詞" && (t.basic_form === "せる" || t.basic_form === "させる")) {
      candidateIds.add(223); // causative
    }
    // Causative-passive
    if (t.surface_form.includes("させられ")) {
      candidateIds.add(228);
    }
    // て-form (detected via grammar_note)
    if (t.grammar_note?.includes("te-form")) {
      candidateIds.add(60); // verb-て
    }
    // Command form
    if (t.pos === "動詞" && t.pos_detail_1 === "自立") {
      // Can't easily detect imperative from tokens alone, but
      // the LLM will handle it if the text contains commands
    }
  }

  return [...candidateIds]
    .map((id) => GP_BY_ID[id])
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);
}

// ── Stage 2: LLM confirmation ───────────────────────────────

/**
 * Build the prompt for Claude to confirm which candidates are actually present.
 * Returns the system prompt and user message.
 */
export function buildConfirmationPrompt(
  sentence: string,
  candidates: GrammarPointDef[],
): { system: string; userMessage: string } {
  const candidateList = candidates
    .map((c) => `${c.id}: ${c.name} — ${c.meaning}`)
    .join("\n");

  const system = `You are a Japanese grammar analyzer. Given a Japanese sentence and a list of candidate grammar points, return ONLY the IDs of grammar points that are actually used in the sentence.

Rules:
- Only confirm a grammar point if the sentence genuinely demonstrates that grammatical pattern
- A word merely appearing is not enough — the grammar point's PATTERN must be present
- For particles (は, が, を, etc.), confirm if used in their grammatical function
- Return a JSON array of confirmed IDs, e.g. [1, 3, 19]
- If no candidates match, return []
- Return ONLY the JSON array, nothing else`;

  const userMessage = `Sentence: ${sentence}

Candidates:
${candidateList}`;

  return { system, userMessage };
}

/**
 * Parse the LLM response into confirmed grammar point IDs.
 */
export function parseConfirmationResponse(response: string): number[] {
  try {
    let cleaned = response.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const ids = JSON.parse(cleaned);
    if (Array.isArray(ids)) {
      return ids.filter((id) => typeof id === "number");
    }
  } catch {
    // Try to extract numbers from the response
    const matches = response.match(/\d+/g);
    if (matches) {
      return matches.map(Number).filter((id) => GP_BY_ID[id]);
    }
  }
  return [];
}
