import type { ProblemListItem } from "../problems/model";
import type { AttemptHistory } from "./attempts";

export type Recommendation = ProblemListItem & { priority: number; reason: string };

const MASTERED_STREAK = 3;

export function summarize(problems: ProblemListItem[], history: AttemptHistory) {
  const entries = problems.map((problem) => history[problem.id]).filter((stats) => stats !== undefined);
  const attempts = entries.reduce((sum, stats) => sum + stats.attempts, 0);
  const successes = entries.reduce((sum, stats) => sum + stats.successes, 0);
  const mastered = entries.filter((stats) => stats.streak >= MASTERED_STREAK).length;
  return {
    attempted: entries.length,
    mastered,
    accuracy: attempts > 0 ? Math.round((successes / attempts) * 100) : 0,
    masteryPercent: problems.length > 0 ? Math.round((mastered / problems.length) * 100) : 0,
  };
}

function classify(problem: ProblemListItem, history: AttemptHistory, now: number): Recommendation {
  const stats = history[problem.id];
  if (!stats) return { ...problem, priority: 2, reason: "New problem" };
  const due = stats.nextReview ? new Date(stats.nextReview).getTime() <= now : true;
  if (due && stats.streak === 0) return { ...problem, priority: 0, reason: "Needs practice" };
  if (due) return { ...problem, priority: 1, reason: "Ready for review" };
  return { ...problem, priority: 3, reason: "On track" };
}

export function recommend(problems: ProblemListItem[], history: AttemptHistory, now: number, limit = 5): Recommendation[] {
  return problems
    .map((problem) => classify(problem, history, now))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}
