import { SRSCard, WordJournalEntry } from "./types";
import { getWordJournal, saveWordJournal } from "./word-journal";
import { lookupJLPT } from "./data/jlpt-levels";

const MIGRATED_KEY = "nihongo-srs-migrated";

export function hasMigrated(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MIGRATED_KEY) === "true";
}

export function migrateSRSToJournal(): void {
  if (hasMigrated()) return;

  try {
    const raw = localStorage.getItem("nihongo-srs-cards");
    if (!raw) {
      localStorage.setItem(MIGRATED_KEY, "true");
      return;
    }

    const srsCards: SRSCard[] = JSON.parse(raw);
    if (srsCards.length === 0) {
      localStorage.setItem(MIGRATED_KEY, "true");
      return;
    }

    const journal = getWordJournal();

    for (const card of srsCards) {
      if (journal[card.word]) continue; // Already in journal

      const encounters = card.correctCount + card.incorrectCount + 1;
      const entry: WordJournalEntry = {
        id: card.word,
        word: card.word,
        reading: card.reading,
        meaning: card.meaning,
        pos: "",
        jlptLevel: lookupJLPT(card.word),
        encounterCount: encounters,
        conversationIds: [],
        firstSeen: card.lastReview || Date.now(),
        lastSeen: card.lastReview || Date.now(),
        naturallyAcquired: encounters >= 5,
        bookmarked: true, // SRS cards were deliberately added, so bookmark them
      };

      journal[card.word] = entry;
    }

    saveWordJournal(journal);
    localStorage.setItem(MIGRATED_KEY, "true");
  } catch {
    // Migration failed — mark as done to avoid retrying
    localStorage.setItem(MIGRATED_KEY, "true");
  }
}
