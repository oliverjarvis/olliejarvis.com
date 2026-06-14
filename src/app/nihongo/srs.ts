import { SRSCard } from "./types";

const STORAGE_KEY = "nihongo-srs-cards";
const INTERVALS = [
  60_000, // 1 min
  600_000, // 10 min
  86_400_000, // 1 day
  259_200_000, // 3 days
  604_800_000, // 7 days
  2_592_000_000, // 30 days
];

export function getCards(): SRSCard[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveCards(cards: SRSCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function addCard(
  word: string,
  reading: string,
  meaning: string,
): SRSCard[] {
  const cards = getCards();
  if (cards.find((c) => c.word === word)) return cards;

  const newCard: SRSCard = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    word,
    reading,
    meaning,
    level: 0,
    nextReview: Date.now(),
    lastReview: 0,
    correctCount: 0,
    incorrectCount: 0,
  };

  const updated = [...cards, newCard];
  saveCards(updated);
  return updated;
}

export function reviewCard(id: string, correct: boolean): SRSCard[] {
  const cards = getCards();
  const updated = cards.map((card) => {
    if (card.id !== id) return card;
    const newLevel = correct ? Math.min(card.level + 1, 5) : 0;
    const interval = INTERVALS[newLevel] ?? INTERVALS[INTERVALS.length - 1];
    return {
      ...card,
      level: newLevel,
      nextReview: Date.now() + interval,
      lastReview: Date.now(),
      correctCount: card.correctCount + (correct ? 1 : 0),
      incorrectCount: card.incorrectCount + (correct ? 0 : 1),
    };
  });
  saveCards(updated);
  return updated;
}

export function getDueCards(): SRSCard[] {
  return getCards().filter((card) => card.nextReview <= Date.now());
}

export function removeCard(id: string): SRSCard[] {
  const cards = getCards().filter((c) => c.id !== id);
  saveCards(cards);
  return cards;
}
