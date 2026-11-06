import { useEffect, useState } from "react";
import { isRecord, readJson, writeJson } from "../../lib/storage";
import { difficultyLabel, difficultyOrder, type ProblemListItem } from "../problems/model";
import { guideFor } from "./guides";
import "./TopicLearningPath.css";

type Props = {
  topic: string;
  problems: ProblemListItem[];
  solvedIds: string[];
  onOpenProblem: (id: string) => void;
};

const STORAGE_KEY = "rock-em:topic-concepts:v1";

function readCheckedConcepts(): Record<string, string[]> {
  const stored = readJson(STORAGE_KEY, isRecord, {});
  return Object.fromEntries(
    Object.entries(stored).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every((item) => typeof item === "string"),
    ),
  );
}

export function TopicLearningPath({ topic, problems, solvedIds, onOpenProblem }: Props) {
  const [checkedByTopic, setCheckedByTopic] = useState(readCheckedConcepts);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => writeJson(STORAGE_KEY, checkedByTopic), [checkedByTopic]);

  const guide = guideFor(topic);
  const checked = checkedByTopic[topic] ?? [];
  const conceptCount = guide.concepts.filter((concept) => checked.includes(concept.title)).length;
  const solvedCount = problems.filter((problem) => solvedIds.includes(problem.id)).length;
  const conceptPercent = Math.round((conceptCount / guide.concepts.length) * 100);
  const problemPercent = problems.length ? Math.round((solvedCount / problems.length) * 100) : 0;
  const mastery = Math.round((conceptPercent + problemPercent) / 2);
  const next = problems
    .filter((problem) => !solvedIds.includes(problem.id))
    .sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty])[0];

  function toggleConcept(title: string) {
    setCheckedByTopic((previous) => {
      const values = previous[topic] ?? [];
      return { ...previous, [topic]: values.includes(title) ? values.filter((value) => value !== title) : [...values, title] };
    });
  }

  return (
    <div className="learning-path">
      <div className="learning-path-heading">
        <div>
          <div className="learning-path-kicker">TOPIC LEARNING PATH</div>
          <h2>{topic}</h2>
        </div>
        <span className="learning-path-percent">{mastery}% complete</span>
      </div>

      <p className="learning-path-intro">{guide.intro}</p>
      <div className="learning-path-progress" role="progressbar" aria-label={`${topic} learning progress`} aria-valuenow={mastery} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${mastery}%` }} />
      </div>
      <div className="learning-path-stats">
        <span>
          {conceptCount}/{guide.concepts.length} concepts learned
        </span>
        <span>
          {solvedCount}/{problems.length} problems solved
        </span>
      </div>

      <button type="button" className="learning-path-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? "Hide learning checklist" : "Explore learning checklist"}
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="learning-path-concepts">
          {guide.concepts.map((concept) => (
            <label className="learning-path-concept" key={concept.title}>
              <input type="checkbox" checked={checked.includes(concept.title)} onChange={() => toggleConcept(concept.title)} />
              <span>
                <strong>{concept.title}</strong>
                <small>{concept.detail}</small>
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="learning-path-next">
        <div>
          <small>{next ? "RECOMMENDED NEXT" : problems.length ? "ALL DONE" : "GET STARTED"}</small>
          <strong>{next ? next.title : problems.length ? "You've solved every problem here!" : "Generate your first problem below"}</strong>
          {next && (
            <span>
              {difficultyLabel[next.difficulty]} · {topic}
            </span>
          )}
        </div>
        {next && (
          <button type="button" onClick={() => onOpenProblem(next.id)}>
            Practice →
          </button>
        )}
      </div>
    </div>
  );
}
