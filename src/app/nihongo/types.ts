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

// Legacy — kept for migration only
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

// Word Journal — replaces SRS
export interface WordJournalEntry {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  pos: string;
  jlptLevel: number; // 5=N5, 4=N4, ... 1=N1, 0=unknown
  encounterCount: number;
  conversationIds: string[];
  firstSeen: number;
  lastSeen: number;
  naturallyAcquired: boolean; // encounterCount >= 5
  bookmarked: boolean;
}

export interface LearnerProfile {
  estimatedLevel: "N5" | "N4" | "N3" | "N2" | "N1";
  totalWords: number;
  wordsByLevel: Record<number, number>;
  acquiredWords: number;
  grammarPatternsSeen: string[];
  conversationsCompleted: number;
  recentTopics: string[];
  reinforcementWords: string[];
  startedAt: number;
}

export interface GrammarPatternEntry {
  pattern: string;
  encounterCount: number;
  firstSeen: number;
}

export interface ConversationRecord {
  id: string;
  title: string;
  level: string;
  topic: string;
  completedAt: number;
  newWordsIntroduced: number;
  exchangeCount: number;
}

export interface KuromojiToken {
  surface_form: string;
  reading: string;
  basic_form: string;
  pos: string;
  pos_detail_1: string;
  grammar_note?: string;
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
