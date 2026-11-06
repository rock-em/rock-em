import { describe, expect, it } from "vitest";
import { nextStats } from "./attempts";

const now = new Date("2026-01-10T12:00:00Z");
const daysUntil = (iso: string | undefined) => Math.round((new Date(iso!).getTime() - now.getTime()) / 86_400_000);

describe("nextStats", () => {
  it("spaces reviews further apart with each consecutive pass", () => {
    const first = nextStats(undefined, true, now);
    const second = nextStats(first, true, now);
    const third = nextStats(second, true, now);
    expect([first, second, third].map((stats) => daysUntil(stats.nextReview))).toEqual([1, 3, 7]);
    expect(third).toMatchObject({ attempts: 3, successes: 3, streak: 3 });
  });

  it("caps the interval at 30 days", () => {
    let stats = nextStats(undefined, true, now);
    for (let i = 0; i < 10; i++) stats = nextStats(stats, true, now);
    expect(daysUntil(stats.nextReview)).toBe(30);
  });

  it("resets the streak and schedules an immediate review after a failure", () => {
    const failed = nextStats(nextStats(undefined, true, now), false, now);
    expect(failed).toMatchObject({ attempts: 2, successes: 1, streak: 0, interval: 0 });
    expect(daysUntil(failed.nextReview)).toBe(0);
  });
});
