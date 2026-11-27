import { describe, expect, it } from "vitest";
import { challengeDay, dailyChallenge } from "./dailyChallenge";
import type { ProblemListItem } from "./model";

const problems: ProblemListItem[] = ["beta", "alpha", "gamma"].map((id) => ({
  id,
  title: id,
  topic: "Array",
  topics: ["Array"],
  difficulty: "easy",
}));

describe("daily challenge", () => {
  it("handles an empty catalog", () => {
    expect(dailyChallenge([], 0)).toBeUndefined();
  });

  it("selects the same problem regardless of catalog order", () => {
    expect(dailyChallenge(problems, 1)?.id).toBe("beta");
    expect(dailyChallenge([...problems].reverse(), 1)?.id).toBe("beta");
    expect(problems[0].id).toBe("beta");
  });

  it("rotates through the catalog and wraps around", () => {
    expect([0, 1, 2, 3].map((day) => dailyChallenge(problems, day)?.id)).toEqual(["alpha", "beta", "gamma", "alpha"]);
  });

  it("uses local calendar dates rather than time of day", () => {
    const morning = challengeDay(new Date(2026, 10, 26, 0, 1));
    expect(challengeDay(new Date(2026, 10, 26, 23, 59))).toBe(morning);
    expect(challengeDay(new Date(2026, 10, 27))).toBe(morning + 1);
  });
});
