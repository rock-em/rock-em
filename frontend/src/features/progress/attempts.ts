import { useEffect, useState } from "react";
import { isRecord, readJson, writeJson } from "../../lib/storage";

export type AttemptStats = {
  attempts: number;
  successes: number;
  streak: number;
  interval: number;
  lastAttempt?: string;
  nextReview?: string;
};

export type AttemptHistory = Record<string, AttemptStats>;

const STORAGE_KEY = "adaptive-practice-progress";
const UPDATED_EVENT = "practice-progress-updated";
const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

export function loadAttempts(): AttemptHistory {
  return readJson(STORAGE_KEY, (value): value is AttemptHistory => isRecord(value), {});
}

export function nextStats(previous: AttemptStats | undefined, passed: boolean, now: Date): AttemptStats {
  const base = previous ?? { attempts: 0, successes: 0, streak: 0, interval: 0 };
  const streak = passed ? base.streak + 1 : 0;
  const interval = passed ? REVIEW_INTERVAL_DAYS[Math.min(streak, REVIEW_INTERVAL_DAYS.length - 1)] : 0;
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);
  return {
    attempts: base.attempts + 1,
    successes: base.successes + (passed ? 1 : 0),
    streak,
    interval,
    lastAttempt: now.toISOString(),
    nextReview: nextReview.toISOString(),
  };
}

export function recordAttempt(problemId: string, passed: boolean) {
  const history = loadAttempts();
  writeJson(STORAGE_KEY, { ...history, [problemId]: nextStats(history[problemId], passed, new Date()) });
  window.dispatchEvent(new Event(UPDATED_EVENT));
}

export function useAttempts() {
  const [history, setHistory] = useState(loadAttempts);
  useEffect(() => {
    const refresh = () => setHistory(loadAttempts());
    window.addEventListener(UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return history;
}
