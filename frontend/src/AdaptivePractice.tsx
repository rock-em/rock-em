
import { useEffect, useMemo, useState } from "react";
import "./AdaptivePractice.css";

const STORAGE_KEY = "adaptive-practice-progress";

// Types
export interface PracticeProblem {
  id: string | number;
  title: string;
  difficulty: string;
}

interface PracticeProgress {
  attempts: number;
  successes: number;
  streak: number;
  interval: number;
  lastAttempt?: string;
  nextReview?: string;
}

type ProgressRecord = Record<string, PracticeProgress>;

interface AdaptivePracticeProps {
  problems: PracticeProblem[];
  onSelectProblem: (problem: PracticeProblem) => void;
}

interface RecommendedProblem extends PracticeProblem {
  priority: number;
  reason: string;
}

// Load saved progress
function loadProgress(): ProgressRecord {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as ProgressRecord) : {};
  } catch {
    return {};
  }
}

// Record a completed submission
export function recordPracticeAttempt(
  problemId: string | number,
  passed: boolean
): void {
  const progress = loadProgress();
  const id = String(problemId);

  const previous: PracticeProgress = progress[id] || {
    attempts: 0,
    successes: 0,
    streak: 0,
    interval: 0,
  };

  const streak = passed ? previous.streak + 1 : 0;

  // Spaced repetition schedule (days)
  const intervals = [0, 1, 3, 7, 14, 30];

  const interval = passed
    ? intervals[Math.min(streak, intervals.length - 1)]
    : 0;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  progress[id] = {
    attempts: previous.attempts + 1,
    successes: previous.successes + (passed ? 1 : 0),
    streak,
    interval,
    lastAttempt: new Date().toISOString(),
    nextReview: nextReview.toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));

  window.dispatchEvent(
    new Event("practice-progress-updated")
  );
}

// Dashboard component
export default function AdaptivePractice({
  problems,
  onSelectProblem,
}: AdaptivePracticeProps) {
  const [progress, setProgress] = useState<ProgressRecord>(
    loadProgress
  );

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

  // Calculate progress statistics
  const stats = useMemo(() => {
    const entries = Object.values(progress);

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
  }, [progress]);

  // Generate personalized recommendations
  const recommendations = useMemo<RecommendedProblem[]>(() => {
    const now = Date.now();

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
  }, [problems, progress]);

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
