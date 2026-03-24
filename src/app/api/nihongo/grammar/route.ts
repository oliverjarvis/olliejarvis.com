import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a Japanese grammar teacher. Break down a Japanese sentence for a learner.

Return ONLY valid JSON:
{
  "breakdown": [
    { "part": "Japanese fragment", "role": "grammatical role", "meaning": "English meaning" }
  ],
  "structure": "Brief sentence pattern description, e.g. 'Topic は Object を Verb (polite past)'",
  "note": "One helpful grammar insight about this sentence (optional, keep short)"
}

RULES:
- Break the sentence into meaningful grammatical chunks (not individual characters)
- Label roles simply: subject, topic, object, verb, adjective, particle, copula, adverb, etc.
- Keep it concise and learner-friendly
- The "structure" should show the abstract pattern
- The "note" should highlight one interesting grammar point`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set" },
      { status: 500 },
    );
  }

  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "No text" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Break down this Japanese sentence: "${text}"`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";
    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return NextResponse.json(JSON.parse(jsonStr));
  } catch (error) {
    console.error("Grammar error:", error);
    return NextResponse.json(
      { error: "Grammar breakdown failed" },
      { status: 500 },
    );
  }
}
