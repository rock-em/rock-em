import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRecentViews,
  readRecentViews,
  RECENT_VIEWS_KEY,
  recordRecentView,
  resolveRecentViews,
} from "./recentViews";

describe("recent problem views", () => {
  beforeEach(() => localStorage.removeItem(RECENT_VIEWS_KEY));

  it("records views newest first and moves revisited problems to the front", () => {
    recordRecentView("first");
    recordRecentView("second");
    recordRecentView("first");
    expect(readRecentViews()).toEqual(["first", "second"]);
  });

  it("limits the history to twelve problems", () => {
    for (let i = 0; i < 15; i++) recordRecentView(`problem-${i}`);
    expect(readRecentViews()).toHaveLength(12);
    expect(readRecentViews()[0]).toBe("problem-14");
    expect(readRecentViews()).not.toContain("problem-0");
  });

  it("recovers from invalid saved data", () => {
    localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify([42]));
    expect(readRecentViews()).toEqual([]);
    recordRecentView("valid");
    expect(readRecentViews()).toEqual(["valid"]);
  });

  it("ignores invalid problem identifiers", () => {
    recordRecentView("../invalid");
    expect(readRecentViews()).toEqual([]);
  });

  it("clears history", () => {
    recordRecentView("first");
    clearRecentViews();
    expect(readRecentViews()).toEqual([]);
  });

  it("resolves available problems in visit order and skips missing entries", () => {
    const first = { id: "first", title: "First" };
    const second = { id: "second", title: "Second" };
    expect(resolveRecentViews(["second", "missing", "first", "second"], [first, second])).toEqual([second, first]);
  });
});
