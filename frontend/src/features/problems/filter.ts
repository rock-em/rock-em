import { difficultyOrder, type Difficulty, type ProblemListItem } from "./model";

export type SortKey = "number" | "title" | "difficulty";
export type Status = "" | "todo" | "solved";

export type Filters = {
  q: string;
  difficulty: Difficulty | "";
  /** A problem must have every selected topic. */
  topics: string[];
  status: Status;
  sort: SortKey;
  descending: boolean;
  page: number;
};

/** A problem with its position in the catalog, which stays put while sorting. */
export type Row = { problem: ProblemListItem; number: number };

export const PAGE_SIZE = 50;

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T) =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function readFilters(query: URLSearchParams): Filters {
  const page = Number(query.get("page"));
  return {
    q: query.get("q") ?? "",
    difficulty: oneOf(query.get("difficulty"), ["", "easy", "medium", "hard"], ""),
    topics: query.getAll("topic"),
    status: oneOf(query.get("status"), ["", "todo", "solved"], ""),
    sort: oneOf(query.get("sort"), ["number", "title", "difficulty"], "number"),
    descending: query.get("order") === "desc",
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Only non-default values are written, so an unfiltered list keeps a clean URL. */
export function writeFilters(filters: Filters): URLSearchParams {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.difficulty) query.set("difficulty", filters.difficulty);
  for (const topic of filters.topics) query.append("topic", topic);
  if (filters.status) query.set("status", filters.status);
  if (filters.sort !== "number") query.set("sort", filters.sort);
  if (filters.descending) query.set("order", "desc");
  if (filters.page > 1) query.set("page", String(filters.page));
  return query;
}

export function isFiltered(filters: Filters) {
  return Boolean(filters.q || filters.difficulty || filters.topics.length || filters.status);
}

export function applyFilters(problems: ProblemListItem[], filters: Filters, solved: ReadonlySet<string>): Row[] {
  const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  const rows: Row[] = [];
  problems.forEach((problem, index) => {
    if (filters.difficulty && problem.difficulty !== filters.difficulty) return;
    if (filters.status && solved.has(problem.id) !== (filters.status === "solved")) return;
    if (!filters.topics.every((topic) => problem.topics.includes(topic))) return;
    if (words.length) {
      const text = `${index + 1} ${problem.title} ${problem.topics.join(" ")}`.toLowerCase();
      if (!words.every((word) => text.includes(word))) return;
    }
    rows.push({ problem, number: index + 1 });
  });

  if (filters.sort === "title") {
    rows.sort((a, b) => a.problem.title.localeCompare(b.problem.title, undefined, { numeric: true }));
  } else if (filters.sort === "difficulty") {
    // Array sort is stable, so problems of one difficulty stay in catalog order.
    rows.sort((a, b) => difficultyOrder[a.problem.difficulty] - difficultyOrder[b.problem.difficulty]);
  }
  if (filters.descending) rows.reverse();
  return rows;
}
