import { readJson, writeJson } from "../../lib/storage";

export const BOOKMARKS_KEY = "rock-em:bookmarks";

function isBookmarkList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === "string" && id.length > 0);
}

export function readBookmarks(): Set<string> {
  return new Set(readJson(BOOKMARKS_KEY, isBookmarkList, []));
}

export function saveBookmarks(bookmarks: ReadonlySet<string>) {
  writeJson(BOOKMARKS_KEY, [...bookmarks]);
}

export function toggleBookmarkId(bookmarks: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(bookmarks);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
