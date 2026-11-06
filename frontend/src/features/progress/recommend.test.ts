import { describe, expect, it } from "vitest";
import type { ProblemListItem } from "../problems/model";
import type { AttemptStats } from "./attempts";
import { recommend, summarize } from "./recommend";

const problem = (id: string): ProblemListItem => ({ id, title: id, topic: "Arrays", difficulty: "easy" });
const stats = (overrides: Partial<AttemptStats>): AttemptStats => ({
  attempts: 1,
  successes: 1,
  streak: 1,
  interval: 1,
  ...overrides,
});
const now = Date.parse("2026-01-10T12:00:00Z");
const past = "2026-01-09T12:00:00Z";
const future = "2026-01-20T12:00:00Z";

describe("recommend", () => {
  it("orders failed, due, new, then on-track problems", () => {
    const history = {
      due: stats({ nextReview: past }),
      failed: stats({ streak: 0, successes: 0, nextReview: past }),
      onTrack: stats({ nextReview: future }),
    };
    const order = recommend([problem("onTrack"), problem("new"), problem("due"), problem("failed")], history, now);
    expect(order.map((item) => [item.id, item.reason])).toEqual([
      ["failed", "Needs practice"],
      ["due", "Ready for review"],
      ["new", "New problem"],
      ["onTrack", "On track"],
    ]);
  });

  it("returns at most the requested number of problems", () => {
    const problems = Array.from({ length: 8 }, (_, index) => problem(`p${index}`));
    expect(recommend(problems, {}, now)).toHaveLength(5);
    expect(recommend(problems, {}, now, 2)).toHaveLength(2);
  });
});

describe("summarize", () => {
  it("counts only problems in the list and rounds percentages", () => {
    const history = {
      a: stats({ attempts: 3, successes: 2, streak: 3 }),
      b: stats({ attempts: 1, successes: 0, streak: 0 }),
      gone: stats({ attempts: 9, successes: 9, streak: 9 }),
    };
    expect(summarize([problem("a"), problem("b"), problem("c")], history)).toEqual({
      attempted: 2,
      mastered: 1,
      accuracy: 50,
      masteryPercent: 33,
    });
  });

  it("reports zeros for an empty history", () => {
    expect(summarize([], {})).toEqual({ attempted: 0, mastered: 0, accuracy: 0, masteryPercent: 0 });
  });
});
