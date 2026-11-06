import { useState, type FormEvent } from "react";
import { navigate } from "../../lib/router";
import { usePractice } from "../practice/context";
import { generateProblem, type Level } from "./api";
import { toVerifiedProblem } from "./verify";
import "./GeneratePage.css";

export function GeneratePage() {
  const { addGenerated, setTopic } = usePractice();
  const [topic, setTopicInput] = useState("");
  const [theme, setTheme] = useState("");
  const [level, setLevel] = useState<Level>("intermediate");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (generating || !topic.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const problem = await toVerifiedProblem(
        await generateProblem({ topic: topic.trim(), theme: theme.trim(), level }),
      );
      addGenerated(problem);
      setTopic(problem.topic);
      navigate(`/problems/${problem.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="page utility-page">
      <section className="generator">
        <h1>Generate a problem</h1>
        <p>Pick something you want to learn and get a fresh problem with test cases, not a repeat of a classic.</p>
        <form className="generator-form" onSubmit={(event) => void submit(event)}>
          <label>
            Topic
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. sliding window, tries, dynamic programming"
              value={topic}
              onChange={(event) => setTopicInput(event.target.value)}
            />
          </label>
          <label>
            Industry or theme <span className="optional">(optional)</span>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. fintech payments, game dev, healthcare"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            />
          </label>
          <label>
            Level
            <select value={level} onChange={(event) => setLevel(event.target.value as Level)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <button type="submit" className="submit-button" disabled={generating || !topic.trim()}>
            {generating ? "Generating…" : "Generate problem"}
          </button>
        </form>
        {generating && (
          <p className="generator-status" role="status">
            Writing the problem and checking its test cases. This can take a minute.
          </p>
        )}
        {error && (
          <p className="generator-status generator-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
