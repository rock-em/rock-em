
import { useEffect, useMemo, useState } from "react";
import {
  loadProgress,
  type PracticeProblem,
  type ProgressRecord,
} from "./practiceProgress";
import "./AdaptivePractice.css";

interface AdaptivePracticeProps {
  problems: PracticeProblem[];
  onSelectProblem: (problem: PracticeProblem) => void;
}

interface RecommendedProblem extends PracticeProblem {
  priority: number;
  reason: string;
}

export default function AdaptivePractice({
  problems,
  onSelectProblem,
}: AdaptivePracticeProps) {
  const [progress, setProgress] = useState<ProgressRecord>(
    loadProgress
  );

  const [now, setNow] = useState(0);

  // Load updated progress after submissions
  useEffect(() => {
    const refresh = (): void => {
      setProgress(loadProgress());
    };

    window.addEventListener(
      "practice-progress-updated",
      refresh
    );

    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(
        "practice-progress-updated",
        refresh
      );

      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Update the current time for scheduled reviews
  useEffect(() => {
    const updateTime = (): void => {
      setNow(Date.now());
    };

    const initialTimer = window.setTimeout(updateTime, 0);

    const interval = window.setInterval(
      updateTime,
      60000
    );

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  // Calculate progress statistics
  const stats = useMemo(() => {
    const entries = problems
      .map((problem) => progress[String(problem.id)])
      .filter((record) => record !== undefined);

    const attempted = entries.length;

    const mastered = entries.filter(
      (p) => p.streak >= 3
    ).length;

    const totalAttempts = entries.reduce(
      (sum, p) => sum + p.attempts,
      0
    );

    const totalSuccesses = entries.reduce(
      (sum, p) => sum + p.successes,
      0
    );

    const accuracy =
      totalAttempts > 0
        ? Math.round(
            (totalSuccesses / totalAttempts) * 100
          )
        : 0;

    return {
      attempted,
      mastered,
      accuracy,
    };
  }, [problems, progress]);

  // Generate personalized recommendations
  const recommendations = useMemo<RecommendedProblem[]>(() => {
    return problems
      .map((problem): RecommendedProblem => {
        const record = progress[String(problem.id)];

        // New problems
        if (!record) {
          return {
            ...problem,
            priority: 2,
            reason: "New problem",
          };
        }

        // Check whether a problem is due for review
        const due = record.nextReview
          ? new Date(record.nextReview).getTime() <= now
          : true;

        // Failed problems receive highest priority
        if (due && record.streak === 0) {
          return {
            ...problem,
            priority: 0,
            reason: "Needs practice",
          };
        }

        // Previously solved problems ready for review
        if (due) {
          return {
            ...problem,
            priority: 1,
            reason: "Ready for review",
          };
        }

        // Problems currently on track
        return {
          ...problem,
          priority: 3,
          reason: "On track",
        };
      })
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5);
  }, [problems, progress, now]);

  const total = problems.length;

  const masteryPercent =
    total > 0
      ? Math.round((stats.mastered / total) * 100)
      : 0;

  return (
    <section className="adaptive-practice">
      <div className="adaptive-heading">
        <div>
          <span className="adaptive-kicker">
            PERSONALIZED LEARNING
          </span>

          <h2>Your Practice Dashboard</h2>
        </div>

        <span className="adaptive-subtitle">
          Based on your recent performance
        </span>
      </div>

      {/* Statistics */}
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

      {/* Mastery Progress Bar */}
      <div className="adaptive-progress-heading">
        <span>Overall Mastery</span>
        <span>{masteryPercent}%</span>
      </div>

      <div
        className="adaptive-progress-bar"
        role="progressbar"
        aria-label="Overall mastery"
        aria-valuenow={masteryPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{
            width: `${masteryPercent}%`,
          }}
        />
      </div>

      {/* Recommended Problems */}
      <div className="adaptive-recommendations">
        <h3>Recommended Practice</h3>

        <p>
          Problems are prioritized based on your previous
          attempts and review schedule.
        </p>

        {recommendations.length === 0 ? (
          <p>No problems available yet.</p>
        ) : (
          recommendations.map((problem) => (
            <button
              type="button"
              className="adaptive-problem"
              key={problem.id}
              onClick={() => onSelectProblem(problem)}
            >
              <span className="adaptive-problem-info">
                <span className="adaptive-problem-title">
                  {problem.title}
                </span>

                <span className="adaptive-problem-difficulty">
                  {problem.difficulty}
                </span>
              </span>

              <span
                className={`adaptive-reason priority-${problem.priority}`}
              >
                {problem.reason}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
