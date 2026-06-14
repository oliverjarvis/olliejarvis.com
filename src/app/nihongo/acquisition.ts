/**
 * Acquisition stages and hidden SRS system.
 *
 * Acquisition is tiered based on research showing:
 * - ~5-10 encounters → recognition
 * - ~10-20 encounters → partial understanding
 * - ~20-50 encounters → stable learning
 * - 50+ encounters → long-term retention
 *
 * The SRS is invisible to the user. Items due for review are fed into
 * the AI prompt so Claude weaves them into conversations naturally.
 */

// ── Acquisition Stages ──────────────────────────────────────

export type AcquisitionStage =
  | "new"        // 1-4 encounters — just seen
  | "recognized" // 5-9 — starting to recognize
  | "familiar"   // 10-19 — partial understanding with context
  | "learned"    // 20-49 — can use with context
  | "acquired";  // 50+ — long-term retention

export const STAGE_THRESHOLDS = {
  recognized: 5,
  familiar: 10,
  learned: 20,
  acquired: 50,
} as const;

export function getStage(encounterCount: number): AcquisitionStage {
  if (encounterCount >= STAGE_THRESHOLDS.acquired) return "acquired";
  if (encounterCount >= STAGE_THRESHOLDS.learned) return "learned";
  if (encounterCount >= STAGE_THRESHOLDS.familiar) return "familiar";
  if (encounterCount >= STAGE_THRESHOLDS.recognized) return "recognized";
  return "new";
}

export function isFullyAcquired(encounterCount: number): boolean {
  return encounterCount >= STAGE_THRESHOLDS.acquired;
}

// ── Stage Display ───────────────────────────────────────────

export const STAGE_COLORS = {
  new:        { dot: "bg-gray-300",    text: "text-gray-500",    bg: "bg-gray-50" },
  recognized: { dot: "bg-sky-400",     text: "text-sky-600",     bg: "bg-sky-50" },
  familiar:   { dot: "bg-amber-400",   text: "text-amber-600",   bg: "bg-amber-50" },
  learned:    { dot: "bg-emerald-300", text: "text-emerald-600", bg: "bg-emerald-50" },
  acquired:   { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
} as const;

export const STAGE_LABELS = {
  new:        "New",
  recognized: "Recognized",
  familiar:   "Familiar",
  learned:    "Learned",
  acquired:   "Acquired",
} as const;

// ── Hidden SRS ──────────────────────────────────────────────

/** Review intervals in milliseconds, keyed by acquisition stage. */
export const SRS_INTERVALS_MS = {
  new:        1 * 24 * 60 * 60 * 1000,   // 1 day
  recognized: 3 * 24 * 60 * 60 * 1000,   // 3 days
  familiar:   7 * 24 * 60 * 60 * 1000,   // 7 days
  learned:    14 * 24 * 60 * 60 * 1000,  // 14 days
  acquired:   30 * 24 * 60 * 60 * 1000,  // 30 days
} as const;

/**
 * Returns true if the item is due for review based on its
 * encounter count and last-seen timestamp.
 */
export function isDueForReview(encounterCount: number, lastSeen: number): boolean {
  const stage = getStage(encounterCount);
  const interval = SRS_INTERVALS_MS[stage];
  return Date.now() - lastSeen > interval;
}

/**
 * Collect items due for review from a journal.
 * Returns items sorted by most overdue first.
 */
export function collectDueItems<
  T extends { encounterCount: number; lastSeen: number; word?: string; name?: string },
>(
  journal: Record<string, T>,
  maxItems: number,
): T[] {
  const now = Date.now();
  const due: { item: T; overdueBy: number }[] = [];

  for (const item of Object.values(journal)) {
    if (item.encounterCount === 0) continue; // Never encountered — not for review
    const stage = getStage(item.encounterCount);
    const interval = SRS_INTERVALS_MS[stage];
    const overdueBy = now - item.lastSeen - interval;
    if (overdueBy > 0) {
      due.push({ item, overdueBy });
    }
  }

  // Most overdue first
  due.sort((a, b) => b.overdueBy - a.overdueBy);
  return due.slice(0, maxItems).map((d) => d.item);
}
