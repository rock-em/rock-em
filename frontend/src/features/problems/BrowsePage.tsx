import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "../../lib/Link";
import { navigate, setQuery, useQuery } from "../../lib/router";
import { usePractice } from "../practice/context";
import { applyFilters, isFiltered, PAGE_SIZE, readFilters, writeFilters, type Filters, type SortKey } from "./filter";
import { difficulties, difficultyLabel } from "./model";
import "./BrowsePage.css";

// three.js is most of the sculpture's weight. Loading it apart from the page
// lets the problem list appear without waiting for it.
const ChromeSculpture = lazy(() => import("./ChromeSculpture").then((module) => ({ default: module.ChromeSculpture })));

const TOPICS_SHOWN = 12;
const columns: [SortKey, string][] = [
  ["number", "#"],
  ["title", "Title"],
  ["difficulty", "Difficulty"],
];

export function BrowsePage() {
  const { problems, topics, solved } = usePractice();
  const query = useQuery();
  const filters = useMemo(() => readFilters(query), [query]);
  const [allTopics, setAllTopics] = useState(false);

  const rows = useMemo(() => applyFilters(problems, filters, solved), [problems, filters, solved]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const solvedCount = rows.reduce((count, row) => count + (solved.has(row.problem.id) ? 1 : 0), 0);

  // Changing a filter returns to the first page; turning a page keeps the rest.
  const update = (change: Partial<Filters>) => setQuery(writeFilters({ ...filters, page: 1, ...change }));
  const toggleTopic = (name: string) =>
    update({
      topics: filters.topics.includes(name)
        ? filters.topics.filter((topic) => topic !== name)
        : [...filters.topics, name],
    });
  const sortBy = (key: SortKey) =>
    update({ sort: key, descending: filters.sort === key ? !filters.descending : false });
  const turnPage = (next: number) => {
    setQuery(writeFilters({ ...filters, page: next }));
    document.getElementById("problem-results")?.scrollIntoView?.({ block: "start" });
  };

  // Selected topics stay visible even when they fall outside the short list.
  const shownTopics = allTopics
    ? topics
    : topics.filter((topic, index) => index < TOPICS_SHOWN || filters.topics.includes(topic.name));
  const heroTopic = filters.topics[0] ?? "All problems";

  return (
    <main className="page browse-page">
      <h1 className="sr-only">Problems</h1>
      <div className="browse-hero">
        <Suspense fallback={<div className="browse-hero-placeholder" />}>
          <ChromeSculpture key={heroTopic} topic={heroTopic} />
        </Suspense>
      </div>

      <div className="filters">
        <input
          aria-label="Search problems"
          className="search"
          type="search"
          placeholder={`Search ${problems.length.toLocaleString()} problems…`}
          value={filters.q}
          onChange={(event) => update({ q: event.target.value })}
        />
        <div className="filter-group" role="group" aria-label="Difficulty">
          {(["", ...difficulties] as const).map((level) => (
            <button
              type="button"
              key={level}
              className="filter-chip"
              aria-pressed={filters.difficulty === level}
              onClick={() => update({ difficulty: level })}
            >
              {level ? difficultyLabel[level] : "All"}
            </button>
          ))}
        </div>
        <label className="filter-select">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(event) => update({ status: event.target.value as Filters["status"] })}
          >
            <option value="">All</option>
            <option value="todo">Unsolved</option>
            <option value="solved">Solved</option>
          </select>
        </label>
      </div>

      <div className="filter-group topic-filter" role="group" aria-label="Topics">
        {shownTopics.map((topic) => (
          <button
            type="button"
            key={topic.name}
            className="filter-chip"
            aria-pressed={filters.topics.includes(topic.name)}
            onClick={() => toggleTopic(topic.name)}
          >
            {topic.name} <span className="chip-count">{topic.count}</span>
          </button>
        ))}
        {topics.length > TOPICS_SHOWN && (
          <button
            type="button"
            className="text-button"
            aria-expanded={allTopics}
            onClick={() => setAllTopics(!allTopics)}
          >
            {allTopics ? "Fewer topics" : `All ${topics.length} topics`}
          </button>
        )}
      </div>

      <div className="results-bar" id="problem-results">
        <span role="status">
          {rows.length.toLocaleString()} {rows.length === 1 ? "problem" : "problems"}
          {" · "}
          {solvedCount.toLocaleString()} solved
        </span>
        <span className="results-actions">
          {isFiltered(filters) && (
            <button type="button" className="text-button" onClick={() => setQuery(new URLSearchParams())}>
              Clear filters
            </button>
          )}
          {rows.length > 0 && (
            <button
              type="button"
              className="text-button"
              onClick={() => navigate(`/problems/${rows[Math.floor(Math.random() * rows.length)].problem.id}`)}
            >
              Pick one for me
            </button>
          )}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="no-results">No problems match these filters.</p>
      ) : (
        <table className="problem-table">
          <thead>
            <tr>
              {columns.map(([key, label]) => (
                <th
                  key={key}
                  scope="col"
                  className={`column-${key}`}
                  aria-sort={filters.sort === key ? (filters.descending ? "descending" : "ascending") : undefined}
                >
                  <button type="button" onClick={() => sortBy(key)} aria-label={`Sort by ${key}`}>
                    {label}
                    <span aria-hidden="true">{filters.sort === key ? (filters.descending ? " ↓" : " ↑") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(({ problem, number }) => {
              const done = solved.has(problem.id);
              return (
                <tr key={problem.id}>
                  <td className="column-number">
                    {done ? (
                      <span title="Solved" aria-label="Solved">
                        ✓
                      </span>
                    ) : (
                      number
                    )}
                  </td>
                  <td className="column-title">
                    <Link href={`/problems/${problem.id}`}>{problem.title}</Link>
                    <span className="problem-topics">{problem.topics.join(" · ")}</span>
                  </td>
                  <td className={`column-difficulty difficulty-${problem.difficulty}`}>
                    {difficultyLabel[problem.difficulty]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {pageCount > 1 && (
        <nav className="pager" aria-label="Pages">
          <button type="button" className="run-button" disabled={page <= 1} onClick={() => turnPage(page - 1)}>
            ← Previous
          </button>
          <span>
            Page {page} of {pageCount}
          </span>
          <button type="button" className="run-button" disabled={page >= pageCount} onClick={() => turnPage(page + 1)}>
            Next →
          </button>
        </nav>
      )}
    </main>
  );
}
