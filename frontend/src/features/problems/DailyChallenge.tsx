import { useEffect, useState } from "react";
import { Link } from "../../lib/Link";
import { usePractice } from "../practice/context";
import { challengeDay, dailyChallenge } from "./dailyChallenge";
import { difficultyLabel } from "./model";
import "./DailyChallenge.css";

export function DailyChallenge() {
  const { problems, solved } = usePractice();
  const [day, setDay] = useState(() => challengeDay(new Date()));

  useEffect(() => {
    const refresh = () => setDay(challengeDay(new Date()));
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const problem = dailyChallenge(problems, day);
  if (!problem) return null;
  const done = solved.has(problem.id);
  const date = new Date(day * 86_400_000).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <section className="daily-challenge" aria-labelledby="daily-challenge-title">
      <div className="daily-challenge-copy">
        <div className="daily-challenge-label">
          <h2 id="daily-challenge-title">Daily challenge</h2>
          <span>{date}</span>
        </div>
        <p className="daily-challenge-name">{problem.title}</p>
        <div className="daily-challenge-meta">
          <span className={`difficulty-${problem.difficulty}`}>{difficultyLabel[problem.difficulty]}</span>
          {problem.topic && <span>{problem.topic}</span>}
          {done && <span className="daily-challenge-solved">✓ Already solved</span>}
        </div>
      </div>
      <Link className="daily-challenge-link" href={`/problems/${problem.id}`}>
        {done ? "Practice again" : "Start challenge"} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
