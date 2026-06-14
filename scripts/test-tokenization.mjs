#!/usr/bin/env node
/**
 * Tests tokenization quality against example sentences from grammar files.
 * Sends a representative sample to the tokenize endpoint and analyzes results.
 */

import { readFileSync } from "fs";
import { join } from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Clean example sentences that DON'T have inline furigana issues
// (manually curated from the grammar files for reliable testing)
const TEST_SENTENCES = [
  // N5 basics
  { id: 1, text: "アイスクリームだ。", expected: "copula" },
  { id: 2, text: "アイスクリームです。", expected: "copula (polite)" },
  { id: 19, text: "テレビを見ます。", expected: "polite" },
  { id: 60, text: "ドアを開けて、中に入ってください。", expected: "te-form" },

  // Particles
  { id: 3, text: "これは本です。", expected: "は particle" },
  { id: 13, text: "空が青い。", expected: "が particle" },
  { id: 18, text: "パンを食べる。", expected: "を particle" },
  { id: 27, text: "東京に行きます。", expected: "に particle" },
  { id: 26, text: "公園で遊ぶ。", expected: "で particle" },

  // Verb conjugations
  { id: 45, text: "疲れた。", expected: "past" },
  { id: 46, text: "手紙を書いた。", expected: "past" },
  { id: 20, text: "パンを食べない。", expected: "negative" },
  { id: 88, text: "日本に行きたい。", expected: "want to" },
  { id: 61, text: "テレビを見ている。", expected: "~ing (ongoing)" },

  // Compound conjugations
  { id: 226, text: "財布を忘れてしまった。", expected: "end up ~ing" },
  { id: 193, text: "明日のために準備しておく。", expected: "do ~ in advance" },
  { id: 234, text: "日本料理を作ってみる。", expected: "try ~ing" },
  { id: 134, text: "雨が降ってきた。", expected: "~ and come" },

  // ので / から (conjunction particles - was the bug)
  { id: 53, text: "今日は寒いので、コートを着ます。", expected: "because/since (ので)" },
  { id: 54, text: "暑いから、窓を開けてください。", expected: "because/since (から)" },

  // Passive (was the bug)
  { id: 142, text: "先生に褒められた。", expected: "passive" },
  { id: 142, text: "弟にケーキを食べられた。", expected: "passive" },
  { id: 142, text: "雨に降られた。", expected: "passive" },

  // Causative
  { id: 223, text: "子供に野菜を食べさせる。", expected: "causative" },
  { id: 223, text: "母は私を買い物に行かせた。", expected: "causative" },

  // Causative-passive
  { id: 228, text: "嫌いな野菜を食べさせられた。", expected: "causative, passive" },

  // Conditional forms
  { id: 176, text: "天気がよければ、散歩に行く。", expected: "ば-conditional" },
  { id: 254, text: "雨が降ったら、中止にします。", expected: "たら conditional" },
  { id: 177, text: "時間があるなら、手伝ってください。", expected: "なら" },

  // Complex patterns
  { id: 162, text: "頑張ったのに、失敗した。", expected: "のに despite" },
  { id: 274, text: "音楽を聴きながら勉強する。", expected: "while ~ing" },
  { id: 312, text: "約束は守るべきだ。", expected: "べき should" },
  { id: 262, text: "明日は雨のはずだ。", expected: "はず" },
  { id: 181, text: "彼は来ないかもしれない。", expected: "かもしれない" },

  // Polite/formal
  { id: 245, text: "先生はお帰りになりました。", expected: "お～になる honorific" },
  { id: 247, text: "少しお待ちください。", expected: "お～ください" },

  // N2+ patterns
  { id: 478, text: "朝ごはんを食べずに学校に行った。", expected: "ずに without" },
  { id: 337, text: "合格するために毎日勉強する。", expected: "ために purpose" },
  { id: 272, text: "疲れたし、お腹も空いたし、帰ろう。", expected: "し reason listing" },

  // Adverbs (should be single tokens)
  { id: 315, text: "なかなか決められない。", expected: "なかなか adverb" },
  { id: 476, text: "ついに夢が叶った。", expected: "ついに adverb" },

  // Double-check: merged patterns
  { id: 88, text: "あの映画が見たくなかった。", expected: "want to, negative, past" },
  { id: 61, text: "ずっと待っていました。", expected: "te-form, ~ing, polite, past" },
];

async function tokenize(text) {
  try {
    const res = await fetch(`${BASE_URL}/api/nihongo/tokenize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data.tokens || [];
  } catch (err) {
    // Try alternate port
    try {
      const res2 = await fetch(`http://localhost:3001/api/nihongo/tokenize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data2 = await res2.json();
      return data2.tokens || [];
    } catch {
      console.error(`Failed to tokenize: ${text}`);
      return [];
    }
  }
}

async function main() {
  console.log("=== TOKENIZATION QUALITY TEST ===\n");

  const results = { pass: 0, fail: 0, issues: [] };

  for (const test of TEST_SENTENCES) {
    const tokens = await tokenize(test.text);
    if (tokens.length === 0) {
      console.log(`  SKIP [${test.id}] ${test.text} (tokenization failed)`);
      continue;
    }

    // Collect all grammar notes
    const allNotes = tokens
      .filter((t) => t.grammar_note)
      .map((t) => ({ surface: t.surface_form, note: t.grammar_note, basic: t.basic_form }));

    const allNotesStr = allNotes.map((n) => n.note).join("; ");

    // Check if expected pattern is present in the grammar notes
    const expectedParts = test.expected.split(",").map((s) => s.trim().toLowerCase());
    const found = expectedParts.every((exp) =>
      allNotesStr.toLowerCase().includes(exp) ||
      tokens.some((t) => t.surface_form.toLowerCase().includes(exp)) ||
      tokens.some((t) => (t.grammar_note || "").toLowerCase().includes(exp))
    );

    // Token summary
    const tokenSummary = tokens
      .filter((t) => t.pos !== "記号")
      .map((t) => {
        const note = t.grammar_note ? ` [${t.grammar_note}]` : "";
        return `${t.surface_form}(${t.pos})${note}`;
      })
      .join(" | ");

    if (found) {
      results.pass++;
      console.log(`  PASS [${test.id}] ${test.text}`);
      console.log(`       expected: ${test.expected}`);
      console.log(`       tokens: ${tokenSummary}`);
    } else {
      results.fail++;
      results.issues.push({
        id: test.id,
        text: test.text,
        expected: test.expected,
        got: allNotesStr || "(no grammar notes)",
        tokens: tokenSummary,
      });
      console.log(`  FAIL [${test.id}] ${test.text}`);
      console.log(`       expected: ${test.expected}`);
      console.log(`       got: ${allNotesStr || "(no grammar notes)"}`);
      console.log(`       tokens: ${tokenSummary}`);
    }
    console.log();
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total: ${TEST_SENTENCES.length} | Pass: ${results.pass} | Fail: ${results.fail}`);
  console.log(`Pass rate: ${Math.round((results.pass / TEST_SENTENCES.length) * 100)}%`);

  if (results.issues.length > 0) {
    console.log(`\n=== FAILURES ===`);
    for (const issue of results.issues) {
      console.log(`  [${issue.id}] ${issue.text}`);
      console.log(`    expected: ${issue.expected}`);
      console.log(`    got: ${issue.got}`);
      console.log(`    tokens: ${issue.tokens}`);
      console.log();
    }
  }
}

main().catch(console.error);
