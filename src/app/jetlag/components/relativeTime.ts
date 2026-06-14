// Format a timestamp as a short relative time, e.g. "just now", "5m", "3h",
// "2d", or a date for older entries. Used by the thread sidebar.
export function relativeTime(ms: number, now: number = Date.now()): string {
  const diff = now - ms;
  if (diff < 0) return "now";

  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;

  // Older than a month: show a short date.
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
