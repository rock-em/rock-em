import { readJson, writeJson } from "../../lib/storage";
import type { AttemptHistory } from "./attempts";

export const GOAL_OPTIONS = [3, 5, 10, 15, 20] as const;
export type WeeklyGoal = (typeof GOAL_OPTIONS)[number];
export const DEFAULT_GOAL: WeeklyGoal = 5;
export const GOAL_KEY = "rock-em-weekly-practice-goal";

export function isWeeklyGoal(value: unknown): value is WeeklyGoal {
  return GOAL_OPTIONS.some((option) => option === value);
}

export function loadWeeklyGoal(): WeeklyGoal {
  return readJson(GOAL_KEY, isWeeklyGoal, DEFAULT_GOAL);
}

export function saveWeeklyGoal(goal: WeeklyGoal) {
  writeJson(GOAL_KEY, goal);
}

// Use the browser's local calendar, with Monday as the first day of the week.
export function weekBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

// Attempt history stores one latest attempt per problem, not every submission.
export function weeklyProgress(history: AttemptHistory, now: Date) {
  const { start, end } = weekBounds(now);
  return Object.values(history).filter((stats) => {
    if (typeof stats?.lastAttempt !== "string") return false;
    const timestamp = Date.parse(stats.lastAttempt);
    return timestamp >= start.getTime() && timestamp < end.getTime() && timestamp <= now.getTime();
  }).length;
}
