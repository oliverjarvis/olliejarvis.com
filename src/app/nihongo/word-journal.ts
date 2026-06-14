import {
  WordJournalEntry,
  KuromojiToken,
  VocabWord,
} from "./types";
import { lookupJLPT } from "./data/jlpt-levels";

const STORAGE_KEY = "nihongo-word-journal";
const ACQUIRED_THRESHOLD = 5;

export function getWordJournal(): Record<string, WordJournalEntry> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveWordJournal(
  journal: Record<string, WordJournalEntry>,
): void {
  // Prune conversationIds for heavily-seen words to save space
  const pruned = { ...journal };
  for (const key in pruned) {
    if (pruned[key].encounterCount > 10 && pruned[key].conversationIds.length > 5) {
      pruned[key] = {
        ...pruned[key],
        conversationIds: pruned[key].conversationIds.slice(-3),
      };
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
}

/**
 * Record tokens from a conversation into the word journal.
 * Called automatically when text is tokenized during conversation flow.
 */
export function recordTokens(
  tokens: KuromojiToken[],
  conversationId: string,
  vocabulary: VocabWord[],
): Record<string, WordJournalEntry> {
  const journal = getWordJournal();
  const now = Date.now();

  for (const token of tokens) {
    // Skip punctuation
    if (
      token.pos === "記号" ||
      /^[。、！？…・「」『』（）\s.!?,;:]+$/.test(token.surface_form)
    ) {
      continue;
    }

    const key = token.basic_form || token.surface_form;
    if (!key || key === "*") continue;

    const existing = journal[key];

    if (existing) {
      existing.encounterCount += 1;
      existing.lastSeen = now;
      if (!existing.conversationIds.includes(conversationId)) {
        existing.conversationIds.push(conversationId);
      }
      existing.naturallyAcquired =
        existing.encounterCount >= ACQUIRED_THRESHOLD;
      // Fill in meaning if we didn't have one
      if (!existing.meaning) {
        const vocab = vocabulary.find(
          (v) => v.word === token.surface_form || v.word === token.basic_form,
        );
        if (vocab) existing.meaning = vocab.meaning;
      }
    } else {
      const vocab = vocabulary.find(
        (v) => v.word === token.surface_form || v.word === token.basic_form,
      );
      journal[key] = {
        id: key,
        word: key,
        reading: token.reading || vocab?.reading || "",
        meaning: vocab?.meaning || "",
        pos: token.pos,
        jlptLevel: lookupJLPT(key),
        encounterCount: 1,
        conversationIds: [conversationId],
        firstSeen: now,
        lastSeen: now,
        naturallyAcquired: false,
        bookmarked: false,
      };
    }
  }

  saveWordJournal(journal);
  return journal;
}

/**
 * Bookmark a word (replaces "Add to SRS").
 */
export function bookmarkWord(
  word: string,
  reading: string,
  meaning: string,
): Record<string, WordJournalEntry> {
  const journal = getWordJournal();
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
  saveWordJournal(journal);
  return journal;
}

export function unbookmarkWord(
  word: string,
): Record<string, WordJournalEntry> {
  const journal = getWordJournal();
  if (journal[word]) {
    journal[word].bookmarked = false;
  }
  saveWordJournal(journal);
  return journal;
}

export function getJournalStats() {
  const journal = getWordJournal();
  const entries = Object.values(journal);
  const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let acquired = 0;
  let bookmarked = 0;

  for (const entry of entries) {
    byLevel[entry.jlptLevel] = (byLevel[entry.jlptLevel] || 0) + 1;
    if (entry.naturallyAcquired) acquired++;
    if (entry.bookmarked) bookmarked++;
  }

  return {
    total: entries.length,
    acquired,
    bookmarked,
    byLevel,
  };
}

export function getWordsForCram(filter: {
  conversationId?: string;
  jlptLevel?: number;
  maxEncounters?: number;
  bookmarkedOnly?: boolean;
}): WordJournalEntry[] {
  const journal = getWordJournal();
  let entries = Object.values(journal).filter((e) => e.meaning); // Only words with meanings

  if (filter.conversationId) {
    entries = entries.filter((e) =>
      e.conversationIds.includes(filter.conversationId!),
    );
  }
  if (filter.jlptLevel !== undefined) {
    entries = entries.filter((e) => e.jlptLevel === filter.jlptLevel);
  }
  if (filter.maxEncounters !== undefined) {
    entries = entries.filter((e) => e.encounterCount <= filter.maxEncounters!);
  }
  if (filter.bookmarkedOnly) {
    entries = entries.filter((e) => e.bookmarked);
  }

  return entries;
}
