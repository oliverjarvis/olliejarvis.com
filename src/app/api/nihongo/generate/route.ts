import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a Japanese language curriculum designer. Generate a conversation scenario for Japanese learners.

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):

{
  "id": "unique-kebab-case-id",
  "title": "Japanese title",
  "titleEn": "English title",
  "level": "beginner" | "intermediate" | "advanced",
  "speaker": "Speaker name in Japanese",
  "speakerDescription": "Short English description of who they are",
  "exchanges": [
    {
      "speakerMessage": "What the speaker says in Japanese",
      "speakerMessageTranslation": "English translation",
      "question": "Comprehension question in Japanese about the message",
      "questionTranslation": "English translation of the question",
      "choices": ["Wrong answer A in Japanese", "Wrong answer B", "Correct answer C", "Wrong answer D"],
      "choiceTranslations": ["English A", "English B", "English C", "English D"],
      "correctChoiceIndex": 2,
      "suggestedAnswer": "How the learner should respond in Japanese",
      "suggestedAnswerTranslation": "English translation of the response",
      "answerParts": ["Meaningful", "phrase", "chunks", "of the answer"],
      "vocabulary": [
        {"word": "辞書形", "reading": "hiragana reading", "meaning": "English meaning"}
      ]
    }
  ]
}

IMPORTANT RULES:
- Generate 4-5 exchanges that form a natural, flowing conversation
- The conversation should feel realistic and teach useful patterns
- Multiple choice: all 4 choices MUST use vocabulary from the actual message so learners can't eliminate by keyword. The distractors should require understanding grammar/meaning to distinguish.
- answerParts: split the suggested answer into 4-8 meaningful phrase chunks (not individual morphemes). These will be scrambled for a word-ordering game.
- vocabulary: include 4-7 key words per exchange with dictionary form, hiragana reading, and English meaning
- Make the Japanese natural — use appropriate politeness levels for the scenario
- Vary the correctChoiceIndex across exchanges (don't always use the same position)`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set" },
      { status: 500 },
    );
  }

  try {
    const { topic, level } = await request.json();

    const userPrompt = topic
      ? `Generate a ${level || "intermediate"} level Japanese conversation about: ${topic}`
      : `Generate a ${level || "intermediate"} level Japanese conversation. Pick an interesting everyday scenario that would be useful for language learners.`;

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: userPrompt }],
      system: SYSTEM_PROMPT,
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON — handle potential markdown wrapping
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const conversation = JSON.parse(jsonStr);

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate conversation" },
      { status: 500 },
    );
  }
}
