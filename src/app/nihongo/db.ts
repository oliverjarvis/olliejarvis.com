import { supabase } from "@/lib/supabase";
import {
  LearnerProfile,
  WordJournalEntry,
  GrammarPatternEntry,
  GrammarPointJournalEntry,
  ConversationRecord,
  Conversation,
  KuromojiToken,
  VocabWord,
  DisplayMessage,
} from "./types";
import { lookupJLPT, getWordsByLevel } from "./data/jlpt-levels";
import { lookupWord, isCompound } from "./data/dictionary";
import {
  STAGE_THRESHOLDS,
  isFullyAcquired,
  collectDueItems,
} from "./acquisition";

const ACQUIRED_THRESHOLD = STAGE_THRESHOLDS.acquired; // 50 encounters

// ============================================================
// Helpers
// ============================================================

async function getUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function getField<T>(field: string): Promise<T | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("user_data")
    .select(field)
    .eq("user_id", userId)
    .single();
  return (data as Record<string, T> | null)?.[field] ?? null;
}

async function setField(field: string, value: unknown): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from("user_data").upsert(
    {
      user_id: userId,
      [field]: value,
    },
    { onConflict: "user_id" },
  );
}

// ============================================================
// Learner Profile
// ============================================================

export async function dbGetProfile(): Promise<LearnerProfile | null> {
  return getField<LearnerProfile>("learner_profile");
}

export async function dbSaveProfile(profile: LearnerProfile): Promise<void> {
  await setField("learner_profile", profile);
}

export async function dbInitProfile(
  level: LearnerProfile["estimatedLevel"],
): Promise<LearnerProfile> {
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
  await dbSaveProfile(profile);
  return profile;
}

export async function dbRecordMCResult(correct: boolean): Promise<void> {
  const profile = await dbGetProfile();
  if (!profile) return;
  const alpha = 0.1;
  profile.mcAccuracy =
    profile.mcAccuracy * (1 - alpha) + (correct ? 1 : 0) * alpha;
  profile.mcTotal += 1;
  await dbSaveProfile(profile);
}

// ============================================================
// Word Journal
// ============================================================

export async function dbGetWordJournal(): Promise<
  Record<string, WordJournalEntry>
> {
  return (await getField<Record<string, WordJournalEntry>>("word_journal")) ?? {};
}

export async function dbSaveWordJournal(
  journal: Record<string, WordJournalEntry>,
): Promise<void> {
  // Prune conversationIds for heavily-seen words
  const pruned = { ...journal };
  for (const key in pruned) {
    if (
      pruned[key].encounterCount > 10 &&
      pruned[key].conversationIds.length > 5
    ) {
      pruned[key] = {
        ...pruned[key],
        conversationIds: pruned[key].conversationIds.slice(-3),
      };
    }
  }
  await setField("word_journal", pruned);
}

export interface RecordTokensResult {
  journal: Record<string, WordJournalEntry>;
  newWords: Set<string>; // basic_forms encountered for the first time
}

/**
 * Resolve meaning for a token, checking (in priority order):
 * 1. Conversation vocabulary list (from Claude)
 * 2. JMdict dictionary
 */
function resolveMeaning(
  token: KuromojiToken,
  vocabulary: VocabWord[],
): { meaning: string; reading: string } {
  // Check conversation vocabulary first
  const vocab = vocabulary.find(
    (v) => v.word === token.surface_form || v.word === token.basic_form,
  );
  if (vocab?.meaning) return { meaning: vocab.meaning, reading: vocab.reading || token.reading };

  // Check JMdict dictionary
  const dictEntry = lookupWord(token.basic_form) || lookupWord(token.surface_form);
  if (dictEntry) return { meaning: dictEntry.m, reading: dictEntry.r || token.reading };

  return { meaning: "", reading: token.reading };
}

export async function dbRecordTokens(
  tokens: KuromojiToken[],
  conversationId: string,
  vocabulary: VocabWord[],
): Promise<RecordTokensResult> {
  const journal = await dbGetWordJournal();
  const now = Date.now();
  const newWords = new Set<string>();

  // First pass: check for compound words that Kuromoji over-split.
  // If adjacent tokens form a known dictionary compound, record the compound instead.
  const processedIndices = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    if (processedIndices.has(i)) continue;

    const token = tokens[i];
    if (
      token.pos === "記号" ||
      /^[。、！？…・「」『』（）\s.!?,;:]+$/.test(token.surface_form)
    ) {
      continue;
    }

    let key = token.basic_form || token.surface_form;
    if (!key || key === "*") continue;

    // Try merging with next token(s) to form a compound
    let mergedReading = token.reading;
    for (let j = i + 1; j < Math.min(i + 3, tokens.length); j++) {
      const next = tokens[j];
      if (next.pos === "記号") break;
      const candidate = key + (next.basic_form || next.surface_form);
      const surfaceCandidate = token.surface_form + tokens.slice(i + 1, j + 1).map(t => t.surface_form).join("");
      if (isCompound(candidate) || isCompound(surfaceCandidate)) {
        key = isCompound(candidate) ? candidate : surfaceCandidate;
        mergedReading += next.reading;
        processedIndices.add(j);
      } else {
        break;
      }
    }

    // Resolve meaning from vocabulary or dictionary
    const resolved = lookupWord(key);
    const vocabMatch = vocabulary.find(
      (v) => v.word === token.surface_form || v.word === token.basic_form || v.word === key,
    );
    const meaning = vocabMatch?.meaning || resolved?.m || "";
    const reading = vocabMatch?.reading || resolved?.r || mergedReading || "";

    const existing = journal[key];

    if (existing) {
      existing.encounterCount += 1;
      existing.lastSeen = now;
      if (!existing.conversationIds.includes(conversationId)) {
        existing.conversationIds.push(conversationId);
      }
      existing.naturallyAcquired = existing.encounterCount >= ACQUIRED_THRESHOLD;
      if (!existing.meaning && meaning) {
        existing.meaning = meaning;
      }
    } else {
      journal[key] = {
        id: key,
        word: key,
        reading,
        meaning,
        pos: token.pos,
        jlptLevel: lookupJLPT(key),
        encounterCount: 1,
        conversationIds: [conversationId],
        firstSeen: now,
        lastSeen: now,
        naturallyAcquired: false,
        bookmarked: false,
      };
      newWords.add(key);
    }
  }

  await dbSaveWordJournal(journal);
  return { journal, newWords };
}

/**
 * Backfill a word's meaning in the journal (called when lookup succeeds).
 * No-ops if the word already has a meaning or doesn't exist.
 */
export async function dbUpdateWordMeaning(
  word: string,
  meaning: string,
): Promise<void> {
  if (!meaning) return;
  const journal = await dbGetWordJournal();
  if (journal[word] && !journal[word].meaning) {
    journal[word].meaning = meaning;
    await dbSaveWordJournal(journal);
  }
}

/**
 * Batch-backfill meanings for words missing them using the JMdict dictionary.
 * Instant — no network calls needed.
 */
export async function dbBackfillMeanings(
  words: string[],
): Promise<void> {
  if (words.length === 0) return;

  const journal = await dbGetWordJournal();
  let updated = false;

  for (const word of words) {
    if (journal[word] && !journal[word].meaning) {
      const dictEntry = lookupWord(word);
      if (dictEntry) {
        journal[word].meaning = dictEntry.m;
        if (!journal[word].reading && dictEntry.r) {
          journal[word].reading = dictEntry.r;
        }
        updated = true;
      }
    }
  }

  if (updated) {
    await dbSaveWordJournal(journal);
  }
}

export async function dbBookmarkWord(
  word: string,
  reading: string,
  meaning: string,
): Promise<Record<string, WordJournalEntry>> {
  const journal = await dbGetWordJournal();
  if (journal[word]) {
    journal[word].bookmarked = true;
    if (!journal[word].meaning && meaning) {
      journal[word].meaning = meaning;
    }
  } else {
    journal[word] = {
      id: word,
      word,
      reading,
      meaning,
      pos: "",
      jlptLevel: lookupJLPT(word),
      encounterCount: 0,
      conversationIds: [],
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      naturallyAcquired: false,
      bookmarked: true,
    };
  }
  await dbSaveWordJournal(journal);
  return journal;
}

export async function dbUnbookmarkWord(
  word: string,
): Promise<Record<string, WordJournalEntry>> {
  const journal = await dbGetWordJournal();
  if (journal[word]) {
    journal[word].bookmarked = false;
  }
  await dbSaveWordJournal(journal);
  return journal;
}

export function computeJournalStats(
  journal: Record<string, WordJournalEntry>,
) {
  const entries = Object.values(journal);
  const byLevel: Record<number, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let acquired = 0;
  let bookmarked = 0;

  for (const entry of entries) {
    byLevel[entry.jlptLevel] = (byLevel[entry.jlptLevel] || 0) + 1;
    if (entry.naturallyAcquired) acquired++;
    if (entry.bookmarked) bookmarked++;
  }

  return { total: entries.length, acquired, bookmarked, byLevel };
}

export async function dbGetJournalStats() {
  const journal = await dbGetWordJournal();
  return computeJournalStats(journal);
}

export function getWordsForCramFromJournal(
  journal: Record<string, WordJournalEntry>,
  filter: {
    conversationId?: string;
    jlptLevel?: number;
    maxEncounters?: number;
    bookmarkedOnly?: boolean;
  },
): WordJournalEntry[] {
  let entries = Object.values(journal).filter((e) => e.meaning);

  if (filter.conversationId) {
    entries = entries.filter((e) =>
      e.conversationIds.includes(filter.conversationId!),
    );
  }
  if (filter.jlptLevel !== undefined) {
    entries = entries.filter((e) => e.jlptLevel === filter.jlptLevel);
  }
  if (filter.maxEncounters !== undefined) {
    entries = entries.filter(
      (e) => e.encounterCount <= filter.maxEncounters!,
    );
  }
  if (filter.bookmarkedOnly) {
    entries = entries.filter((e) => e.bookmarked);
  }

  return entries;
}

// ============================================================
// Grammar Patterns
// ============================================================

export async function dbGetGrammarPatterns(): Promise<
  Record<string, GrammarPatternEntry>
> {
  return (
    (await getField<Record<string, GrammarPatternEntry>>(
      "grammar_patterns",
    )) ?? {}
  );
}

export async function dbSaveGrammarPatterns(
  patterns: Record<string, GrammarPatternEntry>,
): Promise<void> {
  await setField("grammar_patterns", patterns);
}

export async function dbRecordGrammarPatterns(
  tokens: KuromojiToken[],
): Promise<void> {
  const patterns = await dbGetGrammarPatterns();
  const now = Date.now();

  for (const token of tokens) {
    if (!token.grammar_note) continue;

    const notes = token.grammar_note.split(", ");
    for (const note of notes) {
      const key = note.trim().toLowerCase();
      if (!key) continue;

      if (patterns[key]) {
        patterns[key].encounterCount += 1;
      } else {
        patterns[key] = {
          pattern: note.trim(),
          encounterCount: 1,
          firstSeen: now,
        };
      }
    }
  }

  await dbSaveGrammarPatterns(patterns);
}

export function getPatternListFromPatterns(
  patterns: Record<string, GrammarPatternEntry>,
): string[] {
  return Object.values(patterns)
    .sort((a, b) => b.encounterCount - a.encounterCount)
    .map((p) => p.pattern);
}

// ============================================================
// Grammar Points Journal
// ============================================================

export async function dbGetGrammarPointsJournal(): Promise<
  Record<string, GrammarPointJournalEntry>
> {
  return (
    (await getField<Record<string, GrammarPointJournalEntry>>(
      "grammar_points_journal",
    )) ?? {}
  );
}

export async function dbSaveGrammarPointsJournal(
  journal: Record<string, GrammarPointJournalEntry>,
): Promise<void> {
  // Prune conversationIds for heavily-seen points
  const pruned = { ...journal };
  for (const key in pruned) {
    if (
      pruned[key].encounterCount > 10 &&
      pruned[key].conversationIds.length > 5
    ) {
      pruned[key] = {
        ...pruned[key],
        conversationIds: pruned[key].conversationIds.slice(-3),
      };
    }
  }
  await setField("grammar_points_journal", pruned);
}

/**
 * Record confirmed grammar point IDs from the detection system.
 */
export async function dbRecordGrammarPointIds(
  confirmedIds: number[],
  conversationId: string,
): Promise<void> {
  if (confirmedIds.length === 0) return;

  // Lazy import to avoid circular dependency
  const { GP_BY_ID } = await import("./data/grammar-points-db");

  const journal = await dbGetGrammarPointsJournal();
  const now = Date.now();

  for (const id of confirmedIds) {
    const def = GP_BY_ID[id];
    if (!def) continue;

    const key = String(id);
    const existing = journal[key];

    if (existing) {
      existing.encounterCount += 1;
      existing.lastSeen = now;
      if (!existing.conversationIds.includes(conversationId)) {
        existing.conversationIds.push(conversationId);
      }
      existing.naturallyAcquired = existing.encounterCount >= ACQUIRED_THRESHOLD;
    } else {
      journal[key] = {
        id,
        name: def.name,
        meaning: def.meaning,
        jlptLevel: def.jlptLevel,
        url: def.url || "",
        encounterCount: 1,
        conversationIds: [conversationId],
        firstSeen: now,
        lastSeen: now,
        naturallyAcquired: false,
        bookmarked: false,
      };
    }
  }

  await dbSaveGrammarPointsJournal(journal);
}

export function computeGrammarPointsStats(
  journal: Record<string, GrammarPointJournalEntry>,
) {
  const entries = Object.values(journal);
  const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let acquired = 0;
  let bookmarked = 0;

  for (const entry of entries) {
    byLevel[entry.jlptLevel] = (byLevel[entry.jlptLevel] || 0) + 1;
    if (entry.naturallyAcquired) acquired++;
    if (entry.bookmarked) bookmarked++;
  }

  return { total: entries.length, acquired, bookmarked, byLevel };
}

// ============================================================
// Conversation History
// ============================================================

export async function dbGetConversationHistory(): Promise<
  ConversationRecord[]
> {
  return (
    (await getField<ConversationRecord[]>("conversation_history")) ?? []
  );
}

export async function dbRecordConversation(
  record: ConversationRecord,
): Promise<void> {
  const history = await dbGetConversationHistory();
  const filtered = history.filter((c) => c.id !== record.id);
  filtered.push(record);
  const trimmed = filtered.slice(-200);
  await setField("conversation_history", trimmed);
}

// ============================================================
// Saved Conversations (replay)
// ============================================================

export interface SavedConversation {
  messages: DisplayMessage[];
  completedAt: number;
}

export async function dbGetSavedConversations(): Promise<
  Record<string, SavedConversation>
> {
  return (
    (await getField<Record<string, SavedConversation>>(
      "saved_conversations",
    )) ?? {}
  );
}

export async function dbSaveSavedConversations(
  saved: Record<string, SavedConversation>,
): Promise<void> {
  await setField("saved_conversations", saved);
}

// ============================================================
// AI Conversations
// ============================================================

export async function dbGetAiConversations(): Promise<Conversation[]> {
  return (await getField<Conversation[]>("ai_conversations")) ?? [];
}

export async function dbSaveAiConversations(
  conversations: Conversation[],
): Promise<void> {
  await setField("ai_conversations", conversations);
}

// ============================================================
// Profile Rebuild (replaces rebuildProfile in learner-profile.ts)
// ============================================================

const JLPT_TARGETS: Record<number, number> = {
  5: 800,
  4: 1500,
  3: 3700,
  2: 6000,
  1: 10000,
};

const GRAMMAR_BY_LEVEL: Record<string, number> = {
  polite: 5,
  past: 5,
  negative: 5,
  "te-form": 5,
  "want to": 5,
  copula: 5,
  "copula (polite)": 5,
  "~ing (ongoing)": 4,
  "~ and come / has been ~ing": 4,
  "~ and go / continue to ~": 4,
  "try ~ing": 4,
  volitional: 4,
  passive: 3,
  "passive/potential": 3,
  causative: 3,
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
    N5: 5,
    N4: 4,
    N3: 3,
    N2: 2,
    N1: 1,
  };
  return levelMap[profile.estimatedLevel] || 5;
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

function computeWordsToTeach(
  profile: LearnerProfile,
  journal: Record<string, WordJournalEntry>,
): string[] {
  const targetLevel = getTargetLevel(profile);
  const candidates = [
    ...getWordsByLevel(targetLevel),
    ...getWordsByLevel(Math.max(1, targetLevel - 1)),
  ];
  const unseen = candidates.filter((w) => !journal[w]);
  const shuffled = unseen.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8);
}

function computeGrammarToIntroduce(profile: LearnerProfile): string[] {
  const seen = new Set(
    profile.grammarPatternsSeen.map((p) => p.toLowerCase()),
  );
  const targetLevel = getTargetLevel(profile);

  const candidates: string[] = [];
  for (const [pattern, level] of Object.entries(GRAMMAR_BY_LEVEL)) {
    if (level >= targetLevel && !seen.has(pattern.toLowerCase())) {
      candidates.push(pattern);
    }
  }
  for (const [pattern, level] of Object.entries(GRAMMAR_BY_LEVEL)) {
    if (level === targetLevel - 1 && !seen.has(pattern.toLowerCase())) {
      candidates.push(pattern);
    }
  }

  return candidates.slice(0, 3);
}

export async function dbRebuildProfile(): Promise<LearnerProfile> {
  const existing = await dbGetProfile();
  if (!existing) return dbInitProfile("N5");

  const journal = await dbGetWordJournal();
  const patterns = await dbGetGrammarPatterns();
  const history = await dbGetConversationHistory();
  const gpJournal = await dbGetGrammarPointsJournal();

  const stats = computeJournalStats(journal);
  const patternList = getPatternListFromPatterns(patterns);

  // Reinforcement candidates: words seen but not yet fully acquired
  const recentConvIds = history.slice(-5).map((c) => c.id);
  const reinforcement: string[] = [];
  for (const entry of Object.values(journal)) {
    if (
      entry.encounterCount >= 2 &&
      entry.encounterCount < STAGE_THRESHOLDS.acquired &&
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
    grammarPatternsSeen: patternList.slice(0, 50),
    conversationsCompleted: history.length,
    recentTopics: history.slice(-5).map((c) => c.topic),
    reinforcementWords: reinforcement,
    wordsToTeach: [],
    grammarToIntroduce: [],
  };

  profile.wordsToTeach = computeWordsToTeach(profile, journal);
  profile.grammarToIntroduce = computeGrammarToIntroduce(profile);

  // Collect SRS-due items and stash on profile for prompt serialization
  const dueWords = collectDueItems(journal, 15)
    .filter((w) => w.meaning)
    .map((w) => w.word!);
  const dueGrammar = collectDueItems(gpJournal, 10).map(
    (g) => g.name!,
  );
  (profile as LearnerProfileWithSRS)._srsReviewWords = dueWords;
  (profile as LearnerProfileWithSRS)._srsReviewGrammar = dueGrammar;

  await dbSaveProfile(profile);
  return profile;
}

// Internal extension for passing SRS data to serializer without changing the stored type
interface LearnerProfileWithSRS extends LearnerProfile {
  _srsReviewWords?: string[];
  _srsReviewGrammar?: string[];
}

// ============================================================
// Serialize profile for Claude prompts (pure computation)
// ============================================================

export function serializeProfileForPrompt(profile: LearnerProfile): string {
  const levelCoverage = [5, 4, 3, 2, 1]
    .map((l) => {
      const count = profile.wordsByLevel[l] || 0;
      const target = JLPT_TARGETS[l];
      return `N${l}: ${count}/${target}`;
    })
    .join(", ");

  let difficultyNote = "";
  if (profile.mcTotal >= 5) {
    if (profile.mcAccuracy < 0.5) {
      difficultyNote =
        "\nDIFFICULTY: Learner is struggling (low quiz accuracy). Use simpler vocabulary and shorter sentences. Prioritize reinforcement over new material.";
    } else if (profile.mcAccuracy > 0.9) {
      difficultyNote =
        "\nDIFFICULTY: Learner is doing very well. Push slightly harder — more new vocabulary, slightly more complex grammar.";
    }
  }

  const lines = [
    `Level: ${profile.estimatedLevel} | Words: ${profile.totalWords} (${levelCoverage})`,
    `Acquired (${STAGE_THRESHOLDS.acquired}+ encounters): ${profile.acquiredWords} | Conversations: ${profile.conversationsCompleted}`,
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

  // SRS review items (hidden spaced repetition — weave naturally)
  const srsProfile = profile as LearnerProfileWithSRS;
  if (srsProfile._srsReviewWords?.length) {
    lines.push(
      `REVIEW (due for spaced review — weave these naturally): ${srsProfile._srsReviewWords.join(", ")}`,
    );
  }
  if (srsProfile._srsReviewGrammar?.length) {
    lines.push(
      `GRAMMAR REVIEW (due — use these patterns naturally): ${srsProfile._srsReviewGrammar.join(", ")}`,
    );
  }

  if (difficultyNote) {
    lines.push(difficultyNote);
  }

  return lines.join("\n");
}

// ============================================================
// Ensure user_data row exists
// ============================================================

export async function dbEnsureUserRow(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from("user_data").upsert(
    { user_id: userId },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
}
