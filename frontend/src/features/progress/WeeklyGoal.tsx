import { useEffect, useState } from "react";
import { Link } from "../../lib/Link";
import type { AttemptHistory } from "./attempts";
import {
  GOAL_KEY,
  GOAL_OPTIONS,
  isWeeklyGoal,
  loadWeeklyGoal,
  saveWeeklyGoal,
  weekBounds,
  weeklyProgress,
} from "./weeklyGoal";
import "./WeeklyGoal.css";

const dateLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function WeeklyGoal({ history }: { history: AttemptHistory }) {
  const [goal, setGoal] = useState(loadWeeklyGoal);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const sync = (event: StorageEvent) => {
      if (event.key === GOAL_KEY || event.key === null) setGoal(loadWeeklyGoal());
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const completed = weeklyProgress(history, now);
  const remaining = Math.max(0, goal - completed);
  const { start, end } = weekBounds(now);
  const sunday = new Date(end);
  sunday.setDate(sunday.getDate() - 1);

  return (
    <section className="weekly-goal" aria-labelledby="weekly-goal-title">
      <div className="weekly-goal-header">
        <div>
          <h2 id="weekly-goal-title">Weekly practice goal</h2>
          <p className="muted weekly-goal-dates">
            {dateLabel.format(start)} – {dateLabel.format(sunday)}
          </p>
        </div>
        <label className="weekly-goal-setting">
          Target
          <select
            value={goal}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (isWeeklyGoal(value)) {
                setGoal(value);
                saveWeeklyGoal(value);
              }
            }}
          >
            {GOAL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} problems
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="weekly-goal-count" aria-live="polite">
        <span>
          <strong>{completed}</strong> / {goal} problems attempted
        </span>
        <span className={remaining === 0 ? "weekly-goal-achieved" : "muted"}>
          {remaining === 0 ? "Goal reached!" : `${remaining} to go`}
        </span>
      </div>
      <progress aria-label="Weekly practice goal progress" max={goal} value={Math.min(completed, goal)} />
      <div className="weekly-goal-footer">
        <Link href="/">Try a problem →</Link>
      </div>
    </section>
  );
}
