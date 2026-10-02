import { useState } from "react";
import "./index.css";

const problems = [
  { id: 1, title: "Two Sum", topic: "Arrays", difficulty: "Easy", solved: true },
  { id: 2, title: "Valid Parentheses", topic: "Stack", difficulty: "Easy", solved: false },
  { id: 3, title: "Binary Search", topic: "Search", difficulty: "Easy", solved: false },
  { id: 4, title: "Merge Two Sorted Lists", topic: "Linked Lists", difficulty: "Easy", solved: false },
  { id: 5, title: "Maximum Subarray", topic: "Arrays", difficulty: "Medium", solved: false },
  { id: 6, title: "Number of Islands", topic: "Graphs", difficulty: "Medium", solved: false },
];

function App() {
  const topics = [...new Set(problems.map((problem) => problem.topic))];

  const [topicIndex, setTopicIndex] = useState(0);
  const [search, setSearch] = useState("");

  const currentTopic = topics[topicIndex];

  const topicProblems = problems.filter((problem) => {
    const matchesTopic = problem.topic === currentTopic;

    const matchesSearch =
      problem.title.toLowerCase().includes(search.toLowerCase()) ||
      problem.difficulty.toLowerCase().includes(search.toLowerCase());

    return matchesTopic && matchesSearch;
  });

  const solvedCount = problems.filter(
    (problem) => problem.topic === currentTopic && problem.solved
  ).length;

  const totalTopicProblems = problems.filter(
    (problem) => problem.topic === currentTopic
  ).length;

  function nextTopic() {
    setTopicIndex((prev) => (prev + 1) % topics.length);
    setSearch("");
  }

  function previousTopic() {
    setTopicIndex((prev) =>
      prev === 0 ? topics.length - 1 : prev - 1
    );

    setSearch("");
  }

  return (
    <main className="page">
      <section className="intro">
        <h1>rock em</h1>

        <p>
          A place to practice programming that is nice on the eyes :D
        </p>

        <div className="summary">
          <span>
            <strong>Problems</strong> · {problems.length}
          </span>

          <span>
            <strong>Solved</strong> ·{" "}
            {problems.filter((problem) => problem.solved).length}
          </span>

          <span>
            <strong>Topics</strong> · {topics.length}
          </span>
        </div>
      </section>

      <section className="problem-browser">
        <div className="topic-carousel">
          <button
            className="arrow"
            onClick={previousTopic}
            aria-label="Previous topic"
          >
            ←
          </button>

          <div className="silver-bubble" key={currentTopic}>
            <span>{currentTopic}</span>
          </div>

          <button
            className="arrow"
            onClick={nextTopic}
            aria-label="Next topic"
          >
            →
          </button>
        </div>

        <div className="topic-meta">
          {solvedCount} / {totalTopicProblems} solved
          <span> · </span>
          {topicIndex + 1} of {topics.length}
        </div>

        <input
          className="search"
          type="text"
          placeholder={`Search ${currentTopic.toLowerCase()}...`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="problem-list" key={`${currentTopic}-${search}`}>
          {topicProblems.length > 0 ? (
            topicProblems.map((problem) => (
              <a href="#" className="problem-row" key={problem.id}>
                <div className="problem-left">
                  <span className="problem-number">
                    {problem.solved ? "✓" : problem.id}
                  </span>

                  <span className="problem-name">
                    {problem.title}
                  </span>
                </div>

                <span className="difficulty">
                  {problem.difficulty}
                </span>
              </a>
            ))
          ) : (
            <p className="no-results">
              No problems found.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2>About</h2>

        <p>
          rock em is an open source program for practicing programming
          problems!
        </p>
      </section>
    </main>
  );
}

export default App;