import { describe, expect, it } from "vitest";
import { applyFilters, readFilters, writeFilters } from "./filter";
import type { ProblemListItem } from "./model";

const problem = (id: string, difficulty: ProblemListItem["difficulty"], ...topics: string[]): ProblemListItem => ({
  id,
  title: id,
  topic: topics[0],
  topics,
  difficulty,
});
const problems = [
  problem("two-sum", "easy", "Array", "Hash Table"),
  problem("word-ladder", "hard", "Hash Table", "Graph"),
  problem("merge-intervals", "medium", "Array", "Sorting"),
  problem("binary-search", "easy", "Array"),
];
const filters = (search = "") => readFilters(new URLSearchParams(search));
const ids = (search: string, solved: string[] = []) =>
  applyFilters(problems, filters(search), new Set(solved)).map((row) => row.problem.id);

describe("applyFilters", () => {
  it("finds a problem under any of its topics, not only the first", () => {
    expect(ids("topic=Hash+Table")).toEqual(["two-sum", "word-ladder"]);
    expect(ids("topic=Graph")).toEqual(["word-ladder"]);
  });

  it("requires every selected topic and combines with difficulty and status", () => {
    expect(ids("topic=Array&topic=Hash+Table")).toEqual(["two-sum"]);
    expect(ids("topic=Array&difficulty=easy")).toEqual(["two-sum", "binary-search"]);
    expect(ids("topic=Array&status=todo", ["two-sum"])).toEqual(["merge-intervals", "binary-search"]);
    expect(ids("status=solved", ["two-sum"])).toEqual(["two-sum"]);
  });

  it("searches titles, topics and catalog numbers", () => {
    expect(ids("q=MERGE")).toEqual(["merge-intervals"]);
    expect(ids("q=sorting")).toEqual(["merge-intervals"]);
    expect(ids("q=4")).toEqual(["binary-search"]);
  });

  it("sorts by difficulty or title while keeping each problem's catalog number", () => {
    expect(ids("sort=difficulty")).toEqual(["two-sum", "binary-search", "merge-intervals", "word-ladder"]);
    expect(ids("sort=difficulty&order=desc")[0]).toBe("word-ladder");
    const byTitle = applyFilters(problems, filters("sort=title"), new Set());
    expect(byTitle.map((row) => [row.problem.id, row.number])[0]).toEqual(["binary-search", 4]);
  });
});

describe("filter URLs", () => {
  it("round-trips filters and leaves defaults out of the URL", () => {
    const search = "q=tree&difficulty=hard&topic=Array&topic=Graph&status=todo&sort=title&order=desc&page=3";
    expect(writeFilters(filters(search)).toString()).toBe(search);
    expect(writeFilters(filters("")).toString()).toBe("");
  });

  it("ignores values it does not understand", () => {
    expect(filters("difficulty=impossible&sort=random&page=-2&status=maybe")).toMatchObject({
      difficulty: "",
      sort: "number",
      page: 1,
      status: "",
    });
  });
});
