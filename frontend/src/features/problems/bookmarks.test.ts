import { beforeEach, describe, expect, it } from "vitest";
import { BOOKMARKS_KEY, readBookmarks, saveBookmarks, toggleBookmarkId } from "./bookmarks";

describe("bookmarks", () => {
  beforeEach(() => localStorage.removeItem(BOOKMARKS_KEY));

  it("adds and removes IDs without mutating the original set", () => {
    const original = new Set(["two-sum"]);
    const added = toggleBookmarkId(original, "word-ladder");
    expect([...added]).toEqual(["two-sum", "word-ladder"]);
    expect([...original]).toEqual(["two-sum"]);
    expect([...toggleBookmarkId(added, "two-sum")]).toEqual(["word-ladder"]);
  });

  it("restores saved IDs from local storage", () => {
    saveBookmarks(new Set(["two-sum", "word-ladder"]));
    expect([...readBookmarks()]).toEqual(["two-sum", "word-ladder"]);
  });

  it("deduplicates stored IDs and rejects invalid data", () => {
    localStorage.setItem(BOOKMARKS_KEY, '["two-sum","two-sum"]');
    expect([...readBookmarks()]).toEqual(["two-sum"]);
    localStorage.setItem(BOOKMARKS_KEY, '["two-sum",42]');
    expect(readBookmarks().size).toBe(0);
    localStorage.setItem(BOOKMARKS_KEY, "invalid json");
    expect(readBookmarks().size).toBe(0);
  });
});
