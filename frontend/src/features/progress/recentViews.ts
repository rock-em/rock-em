import { readJson, writeJson } from "../../lib/storage";

export const RECENT_VIEWS_KEY = "rock-em:recent-views";
export const RECENT_VIEWS_LIMIT = 12;

function validViews(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id));
}

export function readRecentViews() {
  return readJson(RECENT_VIEWS_KEY, validViews, []);
}

export function recordRecentView(id: string) {
  if (!validViews([id])) return;
  writeJson(
    RECENT_VIEWS_KEY,
    [id, ...readRecentViews().filter((previous) => previous !== id)].slice(0, RECENT_VIEWS_LIMIT),
  );
}

export function clearRecentViews() {
  writeJson(RECENT_VIEWS_KEY, []);
}

export function resolveRecentViews<T extends { id: string }>(ids: readonly string[], problems: readonly T[]): T[] {
  const byId = new Map(problems.map((problem) => [problem.id, problem]));
  return [...new Set(ids)].flatMap((id) => {
    const problem = byId.get(id);
    return problem ? [problem] : [];
  });
}
