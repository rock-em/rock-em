import { useEffect, useState } from "react";
import { isRecord, readJson, writeJson } from "../../lib/storage";

export type Activity = Record<string, number>;
const KEY = "practice-activity-days";
const EVENT = "practice-activity-updated";
export const WEEKS = 12;

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function loadActivity(): Activity {
  return readJson(
    KEY,
    (value): value is Activity =>
      isRecord(value) &&
      Object.entries(value).every(
        ([key, count]) =>
          /^\d{4}-\d{2}-\d{2}$/.test(key) && typeof count === "number" && Number.isSafeInteger(count) && count > 0,
      ),
    {},
  );
}

export function addActivity(history: Activity, now: Date): Activity {
  const key = dayKey(now);
  return { ...history, [key]: (history[key] ?? 0) + 1 };
}

export function recordActivity(now: Date) {
  writeJson(KEY, addActivity(loadActivity(), now));
  window.dispatchEvent(new Event(EVENT));
}

export function useActivity() {
  const [history, setHistory] = useState(loadActivity);
  useEffect(() => {
    const refresh = () => setHistory(loadActivity());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return history;
}

export function activityCalendar(history: Activity, now: Date) {
  const today = dayKey(now);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7);
  return Array.from({ length: WEEKS * 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = dayKey(date);
    const future = key > today;
    return { date, key, future, count: future ? 0 : (history[key] ?? 0) };
  });
}

export function activityLevel(count: number) {
  return count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
}
