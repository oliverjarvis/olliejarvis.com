export interface VocabWord {
  word: string;
  reading: string;
  meaning: string;
}

export interface ConversationExchange {
  speakerMessage: string;
  speakerMessageTranslation: string;
  question: string;
  questionTranslation: string;
  choices: string[];
  choiceTranslations: string[];
  correctChoiceIndex: number;
  suggestedAnswer: string;
  suggestedAnswerTranslation: string;
  answerParts: string[];
  vocabulary: VocabWord[];
}

export interface Conversation {
  id: string;
  title: string;
  titleEn: string;
  level: "beginner" | "intermediate" | "advanced";
  speaker: string;
  speakerDescription: string;
  exchanges: ConversationExchange[];
}

export interface SRSCard {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  level: number;
  nextReview: number;
  lastReview: number;
  correctCount: number;
  incorrectCount: number;
}

export interface KuromojiToken {
  surface_form: string;
  reading: string;
  basic_form: string;
  pos: string;
  pos_detail_1: string;
}

export type GamePhase =
  | "select"
  | "reading"
  | "quiz"
  | "quiz_result"
  | "mode_select"
  | "answering"
  | "answer_feedback"
  | "complete";

export type AnswerMode = "scramble" | "freetext" | "hybrid";

export interface DisplayMessage {
  speaker: string;
  text: string;
  isUser: boolean;
  translation: string;
}
