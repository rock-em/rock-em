import { navigate } from "../../lib/router";
import { usePractice } from "../practice/context";
import { AdaptivePractice } from "./AdaptivePractice";

export function ProgressPage() {
  const { problems, topics, solved } = usePractice();
  return (
    <main className="page utility-page">
      <h1>Practice review</h1>
      <p className="muted">See your progress and choose what to revisit next.</p>
      <div className="summary">
        <span>
          <strong>Problems</strong> · {problems.length}
        </span>
        <span>
          <strong>Solved</strong> · {solved.length}
        </span>
        <span>
          <strong>Topics</strong> · {topics.length}
        </span>
      </div>
      <AdaptivePractice problems={problems} onSelectProblem={(id) => navigate(`/problems/${id}`)} />
    </main>
  );
}
