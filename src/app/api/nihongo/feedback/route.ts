import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a friendly, encouraging Japanese language tutor. A student has just answered a conversational prompt. Compare their answer to the suggested answer and give brief, helpful feedback.

RULES:
- Be warm and encouraging — celebrate what they got right first
- Keep it SHORT — 2-3 sentences max
- If their answer is grammatically correct and makes sense in context, say so! There are many valid ways to answer.
- If there are grammar issues, gently explain ONE thing to improve (don't overwhelm)
- If it's a scramble answer (exact match of suggested), just give a brief grammar insight about the sentence
- Use simple English. You can include the Japanese word/grammar point you're referring to.
- End with something motivating

Return JSON only:
{
  "isValid": true/false,
  "feedback": "Your friendly feedback here",
  "grammarTip": "Optional: one short grammar point from the sentence (or null)"
}`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set" },
      { status: 500 },
    );
  }

  try {
    const { userAnswer, suggestedAnswer, suggestedTranslation, context } =
      await request.json();

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Context: ${context}

Suggested answer: ${suggestedAnswer}
(Meaning: ${suggestedTranslation})

Student's answer: ${userAnswer}

Compare the student's answer to the suggested one. Is it valid? Give brief, friendly feedback.`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const feedback = JSON.parse(jsonStr);
    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      {
        isValid: true,
        feedback: "Great effort! Keep practicing!",
        grammarTip: null,
      },
      { status: 200 },
    );
  }
}
