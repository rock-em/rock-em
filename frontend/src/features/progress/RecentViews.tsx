import { useState } from "react";
import { Link } from "../../lib/Link";
import { usePractice } from "../practice/context";
import { difficultyLabel } from "../problems/model";
import { clearRecentViews, readRecentViews, resolveRecentViews } from "./recentViews";
import "./RecentViews.css";

export function RecentViews() {
  const { problems, generated, solved } = usePractice();
  const [ids, setIds] = useState(readRecentViews);
  const recent = resolveRecentViews(ids, [...problems, ...generated]);
  const clear = () => {
    clearRecentViews();
    setIds([]);
  };

  return (
    <section className="recent-views" aria-labelledby="recent-views-title">
      <div className="recent-views-heading">
        <h2 id="recent-views-title">Recently viewed</h2>
        {ids.length > 0 && (
          <button type="button" onClick={clear}>
            Clear history
          </button>
        )}
      </div>
      <p className="muted">Return to questions you opened on this browser, even if you never submitted a solution.</p>
      {recent.length === 0 ? (
        <p>
          No recent questions. <Link href="/">Browse problems →</Link>
        </p>
      ) : (
        <ol className="recent-views-list">
          {recent.map((problem) => (
            <li key={problem.id}>
              <Link href={`/problems/${problem.id}`} className="recent-views-link">
                <span className="recent-views-name">
                  <strong>{problem.title}</strong>
                  <span className="muted">{problem.topic}</span>
                </span>
                <span className="recent-views-meta">
                  <span className={`difficulty-${problem.difficulty}`}>{difficultyLabel[problem.difficulty]}</span>
                  <span className="muted">{solved.has(problem.id) ? "Solved" : "Revisit"} →</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
