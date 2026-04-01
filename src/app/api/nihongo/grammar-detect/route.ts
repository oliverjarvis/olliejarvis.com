import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a Japanese grammar analyzer. Given a Japanese sentence and a list of candidate grammar points, return ONLY the IDs of grammar points that are actually used in the sentence.

Rules:
- Only confirm a grammar point if the sentence genuinely demonstrates that grammatical pattern
- A word merely appearing is not enough — the grammar point's PATTERN must be present
- For particles (は, が, を, etc.), confirm if used in their grammatical function
- For conjugation patterns (passive, causative, て-form, etc.), confirm if the verb is actually in that form
- For compound expressions (ことができる, てしまう, etc.), confirm only if the full pattern is present
- Return a JSON array of confirmed IDs, e.g. [1, 3, 19]
- If no candidates match, return []
- Return ONLY the JSON array, nothing else`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set" },
      { status: 500 },
    );
  }

  try {
    const { sentence, candidates } = await request.json();

    if (!sentence || !candidates || !Array.isArray(candidates)) {
      return NextResponse.json(
        { error: "sentence and candidates required" },
        { status: 400 },
      );
    }

    const candidateList = candidates
      .map((c: { id: number; name: string; meaning: string }) =>
        `${c.id}: ${c.name} — ${c.meaning}`,
      )
      .join("\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Sentence: ${sentence}\n\nCandidates:\n${candidateList}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "[]";

    let ids: number[] = [];
    try {
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        ids = parsed.filter((id: unknown) => typeof id === "number");
      }
    } catch {
      const matches = text.match(/\d+/g);
      if (matches) ids = matches.map(Number);
    }

    return NextResponse.json({ confirmedIds: ids });
  } catch (error) {
    console.error("Grammar detect error:", error);
    return NextResponse.json(
      { error: "Grammar detection failed" },
      { status: 500 },
    );
  }
}
