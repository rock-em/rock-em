import { useState } from "react";
import { activityCalendar, activityLevel, useActivity } from "./activity";
import "./ActivityHeatmap.css";

const dateLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const monthLabel = new Intl.DateTimeFormat(undefined, { month: "short" });

export function ActivityHeatmap() {
  const history = useActivity();
  const days = activityCalendar(history, new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const current = days.find((day) => day.key === selected && !day.future);
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const active = days.filter((day) => day.count > 0).length;
  const weeks = days.filter((_, index) => index % 7 === 0);

  return (
    <section className="activity-card" aria-labelledby="activity-title">
      <div className="activity-heading">
        <h2 id="activity-title">Practice activity</h2>
        <span className="muted">Last 12 weeks</span>
      </div>
      <div className="activity-stats">
        <div>
          <strong>{total}</strong>
          <span>Submissions</span>
        </div>
        <div>
          <strong>{active}</strong>
          <span>Active days</span>
        </div>
      </div>
      <div className="activity-scroll">
        <div className="activity-calendar">
          <div className="activity-months" aria-hidden="true">
            {weeks.map((week, index) => (
              <span key={week.key}>
                {index === 0 || week.date.getMonth() !== weeks[index - 1].date.getMonth()
                  ? monthLabel.format(week.date)
                  : ""}
              </span>
            ))}
          </div>
          <div className="activity-weekdays" aria-hidden="true">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="activity-grid">
            {days.map((day) => (
              <button
                key={day.key}
                type="button"
                disabled={day.future}
                className={`activity-cell activity-level-${activityLevel(day.count)}`}
                aria-label={`${dateLabel.format(day.date)}: ${day.count} submissions`}
                aria-pressed={selected === day.key}
                title={`${dateLabel.format(day.date)} · ${day.count} submissions`}
                onClick={() => setSelected(day.key)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="activity-footer">
        <span aria-live="polite">
          {current ? `${dateLabel.format(current.date)} · ${current.count} submissions` : "Select a day"}
        </span>
        <div className="activity-legend" aria-label="Activity intensity from less to more">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={`activity-cell activity-level-${level}`} aria-hidden="true" />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}
