import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are playing a character in a Japanese conversation with a language learner. You must stay in character and respond naturally to what the learner says.

After each of your responses, generate a comprehension question and a suggested response for the learner.

Return ONLY valid JSON (no markdown, no explanation):

{
  "speakerMessage": "Your in-character response in Japanese",
  "speakerMessageTranslation": "English translation",
  "question": "Comprehension question about your message, in Japanese",
  "questionTranslation": "English translation of the question",
  "choices": ["Plausible wrong A", "Plausible wrong B", "Correct answer C", "Plausible wrong D"],
  "choiceTranslations": ["English A", "English B", "English C", "English D"],
  "correctChoiceIndex": 2,
  "suggestedAnswer": "A natural response the learner could give in Japanese",
  "suggestedAnswerTranslation": "English translation",
  "answerParts": ["Meaningful", "phrase", "chunks"],
  "vocabulary": [
    {"word": "辞書形", "reading": "hiragana", "meaning": "English"}
  ],
  "shouldEnd": false
}

RULES:
- ALWAYS use kanji where a native speaker would. Write 大好き not だいすき, 僕 not ぼく. The app shows readings on hover.
- Stay in character — respond to what the learner actually said, not a script
- If the learner's Japanese has errors, still understand their intent and continue naturally (don't correct them in-character)
- Multiple choice: all 4 choices must use vocabulary from your message — no easy elimination
- answerParts: 4-8 meaningful phrase chunks of the suggested answer
- vocabulary: 4-7 key words from your message
- Vary correctChoiceIndex
- Set "shouldEnd": true after 4-6 exchanges if the conversation has reached a natural conclusion, or if the learner says goodbye
- Keep the conversation flowing naturally — ask questions, react to answers, share related thoughts`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set" },
      { status: 500 },
    );
  }

  try {
    const {
      speaker,
      speakerDescription,
      topic,
      level,
      conversationHistory,
      userMessage,
      learnerProfile,
      isFirstMessage,
    } = await request.json();

    let system = SYSTEM_PROMPT;

    system += `\n\nYour character: ${speaker} — ${speakerDescription}`;
    system += `\nConversation topic: ${topic}`;
    system += `\nTarget level: ${level}`;

    if (learnerProfile) {
      system += `\n\nLEARNER PROFILE (calibrate vocabulary to i+1):\n${learnerProfile}`;
      system += `\nUse ~90% vocabulary the learner knows, introduce ~10% new. Scaffold advanced topic vocabulary with context clues.`;
    }

    // Build the message history for Claude
    const messages: { role: "user" | "assistant"; content: string }[] = [];

    if (isFirstMessage) {
      messages.push({
        role: "user",
        content: `Start the conversation. You are ${speaker}. Greet the learner and open the topic of "${topic}" naturally. Generate your first message.`,
      });
    } else {
      // Replay the conversation history so Claude has full context
      if (conversationHistory && conversationHistory.length > 0) {
        for (const turn of conversationHistory) {
          if (turn.role === "speaker") {
            messages.push({
              role: "assistant",
              content: JSON.stringify({
                speakerMessage: turn.text,
                speakerMessageTranslation: turn.translation,
              }),
            });
          } else {
            messages.push({
              role: "user",
              content: `The learner responded: "${turn.text}"`,
            });
          }
        }
      }

      messages.push({
        role: "user",
        content: `The learner responded: "${userMessage}"\n\nContinue the conversation naturally. React to what they said.`,
      });
    }

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1000,
      messages,
      system,
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const exchange = JSON.parse(jsonStr);
    return NextResponse.json(exchange);
  } catch (error) {
    console.error("Converse error:", error);
    return NextResponse.json(
      { error: "Conversation failed" },
      { status: 500 },
    );
  }
}
