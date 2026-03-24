import { NextRequest, NextResponse } from "next/server";
import path from "path";

// eslint-disable-next-line
const kuromoji = require("kuromoji");

interface KuromojiTokenizer {
  tokenize(text: string): Array<{
    surface_form: string;
    reading: string;
    basic_form: string;
    pos: string;
    pos_detail_1: string;
  }>;
}

let tokenizer: KuromojiTokenizer | null = null;

function katakanaToHiragana(str: string): string {
  if (!str) return "";
  return str.replace(/[\u30A1-\u30F6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60),
  );
}

function getTokenizer(): Promise<KuromojiTokenizer> {
  if (tokenizer) return Promise.resolve(tokenizer);
  return new Promise((resolve, reject) => {
    kuromoji
      .builder({
        dicPath: path.join(
          process.cwd(),
          "node_modules",
          "kuromoji",
          "dict",
        ),
      })
      .build(
        (
          err: Error | null,
          built: KuromojiTokenizer,
        ) => {
          if (err) return reject(err);
          tokenizer = built;
          resolve(built);
        },
      );
  });
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const tok = await getTokenizer();
    const raw = tok.tokenize(text);

    const mapped = raw.map(
      (t: {
        surface_form: string;
        reading: string;
        basic_form: string;
        pos: string;
        pos_detail_1: string;
      }) => ({
        surface_form: t.surface_form,
        reading: katakanaToHiragana(t.reading),
        basic_form: t.basic_form,
        pos: t.pos,
        pos_detail_1: t.pos_detail_1,
      }),
    );

    // Merge auxiliary verbs (助動詞) and certain particles (助詞/接続助詞)
    // into the preceding token for learner-friendly grouping.
    // e.g. 引っ越し+て+き+まし+た → 引っ越し+て+きました
    const tokens: typeof mapped = [];
    for (const t of mapped) {
      const prev = tokens[tokens.length - 1];
      const shouldMerge =
        prev &&
        prev.pos !== "記号" &&
        (t.pos === "助動詞" ||
          // Merge て/で connecting particles into preceding verb
          (t.pos === "助詞" && t.pos_detail_1 === "接続助詞"));

      if (shouldMerge) {
        prev.surface_form += t.surface_form;
        prev.reading += t.reading;
        // Keep the original token's pos and basic_form
      } else {
        tokens.push({ ...t });
      }
    }

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error("Tokenization error:", error);
    return NextResponse.json(
      { error: "Tokenization failed" },
      { status: 500 },
    );
  }
}
