import { useMemo } from "react";
import { Link } from "../../lib/Link";
import { navigate } from "../../lib/router";
import { usePractice } from "../practice/context";
import { difficulties, difficultyLabel } from "../problems/model";
import { AdaptivePractice } from "./AdaptivePractice";
import { RecentViews } from "./RecentViews";
import { useAttempts } from "./attempts";
import { WeeklyGoal } from "./WeeklyGoal";
import "./ProgressPage.css";

const TOPIC_ROWS = 10;
const RECENT_ROWS = 10;
const day = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function ProgressPage() {
  const { problems, topics, solved } = usePractice();
  const history = useAttempts();

  const review = useMemo(() => {
    const byDifficulty = { easy: [0, 0], medium: [0, 0], hard: [0, 0] };
    const byTopic = new Map(topics.map(({ name, count }) => [name, { name, count, solved: 0, attempted: 0 }]));
    const recent = [];
    for (const problem of problems) {
      const stats = history[problem.id];
      const done = solved.has(problem.id);
      byDifficulty[problem.difficulty][1]++;
      if (done) byDifficulty[problem.difficulty][0]++;
      if (stats?.lastAttempt) recent.push({ problem, stats });
      if (!done && !stats) continue;
      for (const name of problem.topics) {
        const topic = byTopic.get(name)!;
        if (done) topic.solved++;
        if (stats) topic.attempted++;
      }
    }
    recent.sort((a, b) => b.stats.lastAttempt!.localeCompare(a.stats.lastAttempt!));
    // Topics with activity, the least finished first: these are the ones to work on.
    const active = [...byTopic.values()]
      .filter((topic) => topic.solved > 0 || topic.attempted > 0)
      .sort((a, b) => a.solved / a.count - b.solved / b.count || b.attempted - a.attempted);
    return { byDifficulty, active, recent: recent.slice(0, RECENT_ROWS) };
  }, [problems, topics, solved, history]);

  const started = review.active.length > 0;

  return (
    <main className="page utility-page">
      <h1>Practice review</h1>
      <p className="muted">See your progress and choose what to revisit next.</p>
      <div className="summary">
        <span>
          <strong>Problems</strong> · {problems.length.toLocaleString()}
        </span>
        <span>
          <strong>Solved</strong> · {solved.size}
        </span>
        <span>
          <strong>Topics</strong> · {topics.length}
        </span>
      </div>

      <WeeklyGoal history={history} />

      {!started && (
        <p role="status">
          Nothing to review yet. Submit a solution and it will show up here.{" "}
          <Link href="/?difficulty=easy">Start with an easy problem →</Link>
        </p>
      )}

      <AdaptivePractice problems={problems} onSelectProblem={(id) => navigate(`/problems/${id}`)} />

      <RecentViews />

      <h2>Solved by difficulty</h2>
      <table className="plain-table review-table">
        <tbody>
          {difficulties.map((difficulty) => {
            const [done, total] = review.byDifficulty[difficulty];
            return (
              <tr key={difficulty}>
                <th scope="row" className={`difficulty-${difficulty}`}>
                  <Link href={`/?difficulty=${difficulty}&status=todo`}>{difficultyLabel[difficulty]}</Link>
                </th>
                <td className="review-meter">
                  <div className="meter" aria-hidden="true">
                    <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </div>
                </td>
                <td className="numeric">
                  {done} / {total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {started && (
        <>
          <h2>Topics you are working on</h2>
          <p className="muted">Least finished first. Open a topic for its concepts and next problems.</p>
          <table className="plain-table review-table">
            <tbody>
              {review.active.slice(0, TOPIC_ROWS).map((topic) => (
                <tr key={topic.name}>
                  <th scope="row">
                    <Link href={`/learn?${new URLSearchParams({ topic: topic.name })}`}>{topic.name}</Link>
                  </th>
                  <td className="review-meter">
                    <div className="meter" aria-hidden="true">
                      <span style={{ width: `${(topic.solved / topic.count) * 100}%` }} />
                    </div>
                  </td>
                  <td className="numeric">
                    {topic.solved} / {topic.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {review.recent.length > 0 && (
        <>
          <h2>Recent attempts</h2>
          <table className="plain-table">
            <thead>
              <tr>
                <th scope="col">Problem</th>
                <th scope="col">Last tried</th>
                <th scope="col" className="numeric">
                  Passed
                </th>
                <th scope="col" className="numeric">
                  Review on
                </th>
              </tr>
            </thead>
            <tbody>
              {review.recent.map(({ problem, stats }) => (
                <tr key={problem.id}>
                  <td>
                    <Link href={`/problems/${problem.id}`}>{problem.title}</Link>
                  </td>
                  <td className="muted">{day.format(new Date(stats.lastAttempt!))}</td>
                  <td className="numeric">
                    {stats.successes} of {stats.attempts}
                  </td>
                  <td className="numeric muted">{stats.nextReview ? day.format(new Date(stats.nextReview)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
