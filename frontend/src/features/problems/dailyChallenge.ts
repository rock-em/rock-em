import type { ProblemListItem } from "./model";

// Use calendar days rather than elapsed local milliseconds so DST cannot skip a challenge.
export function challengeDay(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export function dailyChallenge(problems: readonly ProblemListItem[], day: number): ProblemListItem | undefined {
  if (!problems.length) return undefined;
  // Catalog order can change without changing the selection for the day.
  const ordered = [...problems].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const index = ((day % ordered.length) + ordered.length) % ordered.length;
  return ordered[index];
}
