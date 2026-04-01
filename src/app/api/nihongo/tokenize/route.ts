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

    interface RawToken {
      surface_form: string;
      reading: string;
      basic_form: string;
      pos: string;
      pos_detail_1: string;
    }

    const mapped: RawToken[] = raw.map(
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

    // Grammar note builders for merged morphemes
    const AUXILIARY_NOTES: Record<string, string> = {
      ます: "polite",
      た: "past",
      ない: "negative",
      ぬ: "negative (literary)",
      れる: "passive",
      られる: "passive/potential",
      せる: "causative",
      させる: "causative",
      たい: "want to",
      だ: "copula",
      です: "copula (polite)",
      う: "volitional",
      よう: "volitional",
      べし: "should/ought to (べき)",
      まい: "will not / probably not",
      らしい: "seems like / apparently",
    };

    const NON_INDEPENDENT_NOTES: Record<string, string> = {
      くる: "~ and come / has been ~ing",
      いく: "~ and go / continue to ~",
      いる: "~ing (ongoing)",
      ある: "has been ~ed (resultative)",
      みる: "try ~ing",
      しまう: "end up ~ing / completely ~",
      おく: "do ~ in advance",
      もらう: "have someone ~",
      あげる: "do ~ for someone",
      くれる: "someone does ~ for me",
      くださる: "someone does ~ for me (polite)",
    };

    // Verb suffix notes (接尾 — causative/passive forms)
    const SUFFIX_VERB_NOTES: Record<string, string> = {
      せる: "causative",
      させる: "causative",
      れる: "passive",
      られる: "passive/potential",
    };

    // Conjunction particle notes (接続助詞 — not all are te-form)
    const CONJUNCTION_NOTES: Record<string, string> = {
      て: "te-form",
      で: "te-form",
      ので: "because/since (ので)",
      から: "because/since (から)",
      ながら: "while ~ing",
      けど: "but/although",
      けれど: "but/although",
      けれども: "but/although",
      たり: "things like ~",
      たら: "if/when (conditional)",
      ら: "if/when (conditional)",
      ば: "if (ば-conditional)",
      し: "and also / reason listing",
      のに: "despite / although",
      ても: "even if/though",
      でも: "even if/though",
    };

    // Merge auxiliary/non-independent morphemes into the preceding token
    // and build grammar notes describing the conjugation.
    interface MergedToken extends RawToken {
      grammar_note?: string;
    }

    const tokens: MergedToken[] = [];
    // Track merged components per token
    const mergedParts: RawToken[][] = [];

    for (const t of mapped) {
      const prev = tokens[tokens.length - 1];
      const shouldMerge =
        prev &&
        prev.pos !== "記号" &&
        (t.pos === "助動詞" ||
          (t.pos === "助詞" && t.pos_detail_1 === "接続助詞") ||
          (t.pos === "動詞" && t.pos_detail_1 === "非自立") ||
          (t.pos === "動詞" && t.pos_detail_1 === "接尾") ||
          (t.pos === "形容詞" && t.pos_detail_1 === "非自立"));

      if (shouldMerge) {
        prev.surface_form += t.surface_form;
        prev.reading += t.reading;
        mergedParts[mergedParts.length - 1].push(t);
      } else {
        tokens.push({ ...t });
        mergedParts.push([t]);
      }
    }

    // Generate grammar notes for merged tokens
    for (let i = 0; i < tokens.length; i++) {
      const parts = mergedParts[i];
      if (parts.length <= 1) continue;

      const notes: string[] = [];
      for (let j = 1; j < parts.length; j++) {
        const p = parts[j];
        if (p.pos === "助詞" && p.pos_detail_1 === "接続助詞") {
          const conjNote = CONJUNCTION_NOTES[p.surface_form] || CONJUNCTION_NOTES[p.basic_form];
          notes.push(conjNote || "te-form");
        } else if (p.pos === "動詞" && p.pos_detail_1 === "非自立") {
          const note = NON_INDEPENDENT_NOTES[p.basic_form];
          if (note) notes.push(note);
        } else if (p.pos === "動詞" && p.pos_detail_1 === "接尾") {
          const note = SUFFIX_VERB_NOTES[p.basic_form];
          if (note) notes.push(note);
        } else if (p.pos === "助動詞") {
          const note = AUXILIARY_NOTES[p.basic_form];
          if (note) notes.push(note);
        } else if (p.pos === "形容詞" && p.pos_detail_1 === "非自立") {
          if (p.basic_form === "ない") notes.push("negative");
          else if (p.basic_form === "ほしい") notes.push("want someone to ~");
        }
      }

      if (notes.length > 0) {
        tokens[i].grammar_note = notes.join(", ");
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
