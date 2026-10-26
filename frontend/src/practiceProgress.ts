
const STORAGE_KEY = "adaptive-practice-progress";

export interface PracticeProblem {
  id: string | number;
  title: string;
  difficulty: string;
}

export interface PracticeProgress {
  attempts: number;
  successes: number;
  streak: number;
  interval: number;
  lastAttempt?: string;
  nextReview?: string;
}

export type ProgressRecord = Record<string, PracticeProgress>;

// Load saved progress
export function loadProgress(): ProgressRecord {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    return saved
      ? (JSON.parse(saved) as ProgressRecord)
      : {};
  } catch {
    return {};
  }
}

// Record a submitted solution
export function recordPracticeAttempt(
  problemId: string | number,
  passed: boolean
): void {
  const progress = loadProgress();
  const id = String(problemId);

  const previous: PracticeProgress = progress[id] || {
    attempts: 0,
    successes: 0,
    streak: 0,
    interval: 0,
  };

  const streak = passed ? previous.streak + 1 : 0;

  // Spaced repetition intervals in days
  const intervals = [0, 1, 3, 7, 14, 30];

  const interval = passed
    ? intervals[Math.min(streak, intervals.length - 1)]
    : 0;

  const nextReview = new Date();

  nextReview.setDate(
    nextReview.getDate() + interval
  );

  progress[id] = {
    attempts: previous.attempts + 1,
    successes: previous.successes + (passed ? 1 : 0),
    streak,
    interval,
    lastAttempt: new Date().toISOString(),
    nextReview: nextReview.toISOString(),
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(progress)
  );

  window.dispatchEvent(
    new Event("practice-progress-updated")
  );
}
