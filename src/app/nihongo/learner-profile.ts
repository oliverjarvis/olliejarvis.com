import { LearnerProfile, ConversationRecord } from "./types";
import { getWordJournal, getJournalStats } from "./word-journal";
import { getPatternList, getGrammarPatterns } from "./grammar-patterns";
import { getWordsByLevel } from "./data/jlpt-levels";

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
    grammarToIntroduce: [],
    wordsToTeach: [],
    conversationsCompleted: 0,
    recentTopics: [],
    reinforcementWords: [],
    mcAccuracy: 1.0,
    mcTotal: 0,
    startedAt: Date.now(),
  };
  saveLearnerProfile(profile);
  return profile;
}

/**
 * Record an MC quiz result for the difficulty feedback loop.
 */
export function recordMCResult(correct: boolean): void {
  const profile = getLearnerProfile();
  if (!profile) return;

  const alpha = 0.1; // Exponential moving average weight
  profile.mcAccuracy = profile.mcAccuracy * (1 - alpha) + (correct ? 1 : 0) * alpha;
  profile.mcTotal += 1;

  saveLearnerProfile(profile);
}

// JLPT target word counts per level
const JLPT_TARGETS: Record<number, number> = {
  5: 800,
  4: 1500,
  3: 3700,
  2: 6000,
  1: 10000,
};

// Grammar patterns organized by approximate level
const GRAMMAR_BY_LEVEL: Record<string, number> = {
  "polite": 5,
  "past": 5,
  "negative": 5,
  "te-form": 5,
  "want to": 5,
  "copula": 5,
  "copula (polite)": 5,
  "~ing (ongoing)": 4,
  "~ and come / has been ~ing": 4,
  "~ and go / continue to ~": 4,
  "try ~ing": 4,
  "volitional": 4,
  "passive": 3,
  "passive/potential": 3,
  "causative": 3,
  "end up ~ing / completely ~": 3,
  "do ~ in advance": 3,
  "have someone ~": 3,
  "do ~ for someone": 3,
  "someone does ~ for me": 3,
  "someone does ~ for me (polite)": 2,
  "negative (literary)": 2,
  "want someone to ~": 2,
  "has been ~ed (resultative)": 2,
};

function getTargetLevel(profile: LearnerProfile): number {
  const levelMap: Record<string, number> = {
    N5: 5, N4: 4, N3: 3, N2: 2, N1: 1,
  };
  return levelMap[profile.estimatedLevel] || 5;
}

/**
 * Find JLPT words at the target level that the user hasn't seen yet.
 * Returns a short list for the prompt.
 */
function computeWordsToTeach(profile: LearnerProfile): string[] {
  const journal = getWordJournal();
  const targetLevel = getTargetLevel(profile);

  // Get words at the user's current and next level
  const candidates = [
    ...getWordsByLevel(targetLevel),
    ...getWordsByLevel(Math.max(1, targetLevel - 1)),
  ];

  // Filter to words not in journal
  const unseen = candidates.filter((w) => !journal[w]);

  // Shuffle and take 8
  const shuffled = unseen.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8);
}

/**
 * Find grammar patterns the user hasn't seen that are at or below their level.
 */
function computeGrammarToIntroduce(profile: LearnerProfile): string[] {
  const seen = new Set(profile.grammarPatternsSeen.map((p) => p.toLowerCase()));
  const targetLevel = getTargetLevel(profile);

  const candidates: string[] = [];
  for (const [pattern, level] of Object.entries(GRAMMAR_BY_LEVEL)) {
    if (level >= targetLevel && !seen.has(pattern.toLowerCase())) {
      candidates.push(pattern);
    }
  }

  // Also check one level up for gentle pushing
  for (const [pattern, level] of Object.entries(GRAMMAR_BY_LEVEL)) {
    if (level === targetLevel - 1 && !seen.has(pattern.toLowerCase())) {
      candidates.push(pattern);
    }
  }

  return candidates.slice(0, 3);
}

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
 * Rebuild the profile from current word journal + grammar patterns.
 */
export function rebuildProfile(): LearnerProfile {
  const existing = getLearnerProfile();
  if (!existing) return initProfile("N5");

  const stats = getJournalStats();
  const patterns = getPatternList();
  const history = getConversationHistory();
  const journal = getWordJournal();

  // Reinforcement candidates: words seen 2-4 times from recent conversations
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
    // Compute adaptive recommendations
    wordsToTeach: [],
    grammarToIntroduce: [],
  };

  // These depend on the profile being partially built
  profile.wordsToTeach = computeWordsToTeach(profile);
  profile.grammarToIntroduce = computeGrammarToIntroduce(profile);

  saveLearnerProfile(profile);
  return profile;
}

/**
 * Serialize for Claude prompts. ~200-300 tokens.
 */
export function serializeProfileForPrompt(profile: LearnerProfile): string {
  const levelCoverage = [5, 4, 3, 2, 1]
    .map((l) => {
      const count = profile.wordsByLevel[l] || 0;
      const target = JLPT_TARGETS[l];
      return `N${l}: ${count}/${target}`;
    })
    .join(", ");

  // Difficulty adjustment based on MC accuracy
  let difficultyNote = "";
  if (profile.mcTotal >= 5) {
    if (profile.mcAccuracy < 0.5) {
      difficultyNote = "\nDIFFICULTY: Learner is struggling (low quiz accuracy). Use simpler vocabulary and shorter sentences. Prioritize reinforcement over new material.";
    } else if (profile.mcAccuracy > 0.9) {
      difficultyNote = "\nDIFFICULTY: Learner is doing very well. Push slightly harder — more new vocabulary, slightly more complex grammar.";
    }
  }

  const lines = [
    `Level: ${profile.estimatedLevel} | Words: ${profile.totalWords} (${levelCoverage})`,
    `Acquired (5+ encounters): ${profile.acquiredWords} | Conversations: ${profile.conversationsCompleted}`,
  ];

  if (profile.grammarPatternsSeen.length > 0) {
    lines.push(
      `Grammar seen: ${profile.grammarPatternsSeen.slice(0, 20).join(", ")}`,
    );
  }

  if (profile.grammarToIntroduce.length > 0) {
    lines.push(
      `NEW GRAMMAR TO INTRODUCE (use 1-2 of these): ${profile.grammarToIntroduce.join(", ")}`,
    );
  }

  if (profile.wordsToTeach.length > 0) {
    lines.push(
      `NEW WORDS TO TEACH (weave 3-5 of these into the conversation): ${profile.wordsToTeach.join(", ")}`,
    );
  }

  if (profile.reinforcementWords.length > 0) {
    lines.push(
      `Reinforce (seen 2-4x, reuse naturally): ${profile.reinforcementWords.join(", ")}`,
    );
  }

  if (profile.recentTopics.length > 0) {
    lines.push(`Recent topics: ${profile.recentTopics.join(", ")}`);
  }

  if (difficultyNote) {
    lines.push(difficultyNote);
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
  const filtered = history.filter((c) => c.id !== record.id);
  filtered.push(record);
  const trimmed = filtered.slice(-200);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}
