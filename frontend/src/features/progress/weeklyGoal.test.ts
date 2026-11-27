import { beforeEach, describe, expect, it } from "vitest";
import type { AttemptStats } from "./attempts";
import {
  DEFAULT_GOAL,
  GOAL_KEY,
  isWeeklyGoal,
  loadWeeklyGoal,
  saveWeeklyGoal,
  weekBounds,
  weeklyProgress,
} from "./weeklyGoal";

function stats(date: Date): AttemptStats {
  return { attempts: 4, successes: 0, streak: 0, interval: 0, lastAttempt: date.toISOString() };
}

const now = new Date(2026, 10, 27, 12);

describe("weekly practice goals", () => {
  beforeEach(() => localStorage.clear());

  it("uses Monday through Sunday in local time", () => {
    expect(weekBounds(now)).toEqual({ start: new Date(2026, 10, 23), end: new Date(2026, 10, 30) });
  });

  it("counts distinct problems rather than repeated submissions", () => {
    expect(weeklyProgress({ a: stats(now), b: stats(now) }, now)).toBe(2);
  });

  it("includes Monday and excludes previous weeks", () => {
    expect(weeklyProgress({ a: stats(new Date(2026, 10, 23)), b: stats(new Date(2026, 10, 22, 23, 59)) }, now)).toBe(1);
  });

  it("ignores invalid, missing and future attempt dates", () => {
    expect(
      weeklyProgress(
        {
          a: { ...stats(now), lastAttempt: "invalid" },
          b: { ...stats(now), lastAttempt: undefined },
          c: stats(new Date(2026, 10, 28)),
        },
        now,
      ),
    ).toBe(0);
  });

  it("starts a new week on Monday", () => {
    expect(weeklyProgress({ a: stats(now) }, new Date(2026, 10, 30))).toBe(0);
  });

  it("persists a supported target", () => {
    expect(loadWeeklyGoal()).toBe(DEFAULT_GOAL);
    saveWeeklyGoal(10);
    expect(loadWeeklyGoal()).toBe(10);
  });

  it("rejects unsupported targets and falls back safely", () => {
    expect(isWeeklyGoal("5")).toBe(false);
    expect(isWeeklyGoal(0)).toBe(false);
    localStorage.setItem(GOAL_KEY, "999");
    expect(loadWeeklyGoal()).toBe(DEFAULT_GOAL);
  });
});
