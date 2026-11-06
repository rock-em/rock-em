import { useState } from "react";
import { navigate } from "../../lib/router";
import { usePractice } from "../practice/context";
import { ChromeSculpture } from "./ChromeSculpture";
import { difficultyLabel } from "./model";
import "./BrowsePage.css";

export function BrowsePage() {
  const { problems, topics, topic, setTopic, solved } = usePractice();
  const [search, setSearch] = useState("");
  const topicIndex = topics.indexOf(topic);
  const inTopic = problems.filter((problem) => problem.topic === topic);
  const query = search.toLowerCase();
  const matches = inTopic.filter(
    (problem) => problem.title.toLowerCase().includes(query) || problem.difficulty.includes(query),
  );
  const solvedCount = inTopic.filter((problem) => solved.includes(problem.id)).length;

  function step(offset: number) {
    setTopic(topics[(topicIndex + offset + topics.length) % topics.length]);
    setSearch("");
  }

  return (
    <main className="page browse-page">
      <h1 className="sr-only">Programming practice</h1>
      <section className="problem-browser">
        <div className="topic-carousel">
          <button className="arrow" onClick={() => step(-1)} aria-label="Previous topic">
            ←
          </button>
          <ChromeSculpture key={topic} topic={topic} />
          <button className="arrow" onClick={() => step(1)} aria-label="Next topic">
            →
          </button>
        </div>
        <div className="topic-meta">
          {solvedCount} / {inTopic.length} solved <span> · </span> {topicIndex + 1} of {topics.length}
        </div>
        <input
          aria-label={`Search ${topic} problems`}
          className="search"
          type="text"
          placeholder={`Search ${topic.toLowerCase()}...`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="problem-list" key={`${topic}-${search}`}>
          {matches.length ? (
            matches.map((problem, index) => (
              <button
                type="button"
                className="problem-row"
                key={problem.id}
                onClick={() => navigate(`/problems/${problem.id}`)}
              >
                <span className="problem-left">
                  <span className="problem-number">{solved.includes(problem.id) ? "✓" : index + 1}</span>
                  <span className="problem-name">{problem.title}</span>
                </span>
                <span className="difficulty">{difficultyLabel[problem.difficulty]}</span>
              </button>
            ))
          ) : (
            <p className="no-results">No problems found.</p>
          )}
        </div>
      </section>
    </main>
  );
}
