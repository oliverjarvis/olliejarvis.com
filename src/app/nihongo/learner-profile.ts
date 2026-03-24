import { LearnerProfile, ConversationRecord } from "./types";
import { getWordJournal, getJournalStats } from "./word-journal";
import { getPatternList } from "./grammar-patterns";

const PROFILE_KEY = "nihongo-learner-profile";
const HISTORY_KEY = "nihongo-conversation-history";

export function getLearnerProfile(): LearnerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveLearnerProfile(profile: LearnerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function initProfile(level: LearnerProfile["estimatedLevel"]): LearnerProfile {
  const profile: LearnerProfile = {
    estimatedLevel: level,
    totalWords: 0,
    wordsByLevel: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    acquiredWords: 0,
    grammarPatternsSeen: [],
    conversationsCompleted: 0,
    recentTopics: [],
    reinforcementWords: [],
    startedAt: Date.now(),
  };
  saveLearnerProfile(profile);
  return profile;
}

/**
 * Rebuild the profile from current word journal + grammar patterns.
 * Called after conversations to keep profile in sync.
 */
export function rebuildProfile(): LearnerProfile {
  const existing = getLearnerProfile();
  if (!existing) return initProfile("N5");

  const stats = getJournalStats();
  const patterns = getPatternList();
  const history = getConversationHistory();
  const journal = getWordJournal();

  // Find reinforcement candidates: words seen 2-4 times from recent conversations
  const recentConvIds = history.slice(-5).map((c) => c.id);
  const reinforcement: string[] = [];
  for (const entry of Object.values(journal)) {
    if (
      entry.encounterCount >= 2 &&
      entry.encounterCount <= 4 &&
      entry.meaning &&
      entry.conversationIds.some((id) => recentConvIds.includes(id))
    ) {
      reinforcement.push(entry.word);
      if (reinforcement.length >= 20) break;
    }
  }

  // Auto-estimate level from JLPT coverage
  const estimatedLevel = estimateLevelFromCoverage(stats.byLevel);

  const profile: LearnerProfile = {
    ...existing,
    estimatedLevel,
    totalWords: stats.total,
    wordsByLevel: stats.byLevel,
    acquiredWords: stats.acquired,
    grammarPatternsSeen: patterns.slice(0, 50),
    conversationsCompleted: history.length,
    recentTopics: history.slice(-5).map((c) => c.topic),
    reinforcementWords: reinforcement,
  };

  saveLearnerProfile(profile);
  return profile;
}

// JLPT target word counts per level
const JLPT_TARGETS: Record<number, number> = {
  5: 800,
  4: 1500,
  3: 3700,
  2: 6000,
  1: 10000,
};

function estimateLevelFromCoverage(
  byLevel: Record<number, number>,
): LearnerProfile["estimatedLevel"] {
  const n5coverage = (byLevel[5] || 0) / JLPT_TARGETS[5];
  const n4coverage = (byLevel[4] || 0) / JLPT_TARGETS[4];
  const n3coverage = (byLevel[3] || 0) / JLPT_TARGETS[3];
  const n2coverage = (byLevel[2] || 0) / JLPT_TARGETS[2];

  if (n2coverage > 0.5) return "N1";
  if (n3coverage > 0.5) return "N2";
  if (n4coverage > 0.5) return "N3";
  if (n5coverage > 0.5) return "N4";
  return "N5";
}

/**
 * Serialize the profile into a compact text block for Claude prompts.
 * Target: ~200 tokens.
 */
export function serializeProfileForPrompt(profile: LearnerProfile): string {
  const levelCoverage = [5, 4, 3, 2, 1]
    .map((l) => {
      const count = profile.wordsByLevel[l] || 0;
      const target = JLPT_TARGETS[l];
      return `N${l}: ${count}/${target}`;
    })
    .join(", ");

  const lines = [
    `Level: ${profile.estimatedLevel} | Words: ${profile.totalWords} (${levelCoverage})`,
    `Acquired (5+ encounters): ${profile.acquiredWords} | Conversations: ${profile.conversationsCompleted}`,
  ];

  if (profile.grammarPatternsSeen.length > 0) {
    lines.push(
      `Grammar seen: ${profile.grammarPatternsSeen.slice(0, 20).join(", ")}`,
    );
  }

  if (profile.recentTopics.length > 0) {
    lines.push(`Recent topics: ${profile.recentTopics.join(", ")}`);
  }

  if (profile.reinforcementWords.length > 0) {
    lines.push(
      `Reinforce (seen 2-4x): ${profile.reinforcementWords.join(", ")}`,
    );
  }

  return lines.join("\n");
}

// Conversation history

export function getConversationHistory(): ConversationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function recordConversation(record: ConversationRecord): void {
  const history = getConversationHistory();
  // Avoid duplicates
  const filtered = history.filter((c) => c.id !== record.id);
  filtered.push(record);
  // Keep last 200
  const trimmed = filtered.slice(-200);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}
