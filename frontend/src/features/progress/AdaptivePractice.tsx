import { useEffect, useState } from "react";
import { difficultyLabel, type ProblemListItem } from "../problems/model";
import { useAttempts } from "./attempts";
import { recommend, summarize } from "./recommend";
import "./AdaptivePractice.css";

type Props = {
  problems: ProblemListItem[];
  onSelectProblem: (id: string) => void;
};

function useNow(intervalMs: number) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [intervalMs]);
  return now;
}

export function AdaptivePractice({ problems, onSelectProblem }: Props) {
  const history = useAttempts();
  const now = useNow(60_000);
  const stats = summarize(problems, history);
  const recommendations = recommend(problems, history, now);

  return (
    <section className="adaptive-practice">
      <div className="adaptive-heading">
        <div>
          <span className="adaptive-kicker">PERSONALIZED LEARNING</span>
          <h2>Your Practice Dashboard</h2>
        </div>
        <span className="adaptive-subtitle">Based on your recent performance</span>
      </div>

      <div className="adaptive-stats">
        <div className="adaptive-stat">
          <span>Problems Attempted</span>
          <strong>{stats.attempted}</strong>
        </div>
        <div className="adaptive-stat">
          <span>Submission Success</span>
          <strong>{stats.accuracy}%</strong>
        </div>
        <div className="adaptive-stat">
          <span>Problems Mastered</span>
          <strong>{stats.mastered}</strong>
        </div>
      </div>

      <div className="adaptive-progress-heading">
        <span>Overall Mastery</span>
        <span>{stats.masteryPercent}%</span>
      </div>
      <div
        className="adaptive-progress-bar"
        role="progressbar"
        aria-label="Overall mastery"
        aria-valuenow={stats.masteryPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{ width: `${stats.masteryPercent}%` }} />
      </div>

      <div className="adaptive-recommendations">
        <h3>Recommended Practice</h3>
        <p>Problems are prioritized based on your previous attempts and review schedule.</p>
        {recommendations.length === 0 ? (
          <p>No problems available yet.</p>
        ) : (
          recommendations.map((problem) => (
            <button
              type="button"
              className="adaptive-problem"
              key={problem.id}
              onClick={() => onSelectProblem(problem.id)}
            >
              <span className="adaptive-problem-info">
                <span className="adaptive-problem-title">{problem.title}</span>
                <span className="adaptive-problem-difficulty">{difficultyLabel[problem.difficulty]}</span>
              </span>
              <span className={`adaptive-reason priority-${problem.priority}`}>{problem.reason}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
