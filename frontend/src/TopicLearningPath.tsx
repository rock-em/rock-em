import { useEffect, useState } from "react";
import "./TopicLearningPath.css";

type TopicProblem = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

type Props = {
  topic: string;
  problems: TopicProblem[];
  completedIds: string[];
  onOpenProblem: (id: string) => void;
};

type Guide = { intro: string; concepts: { title: string; detail: string }[] };

const guides: Record<string, Guide> = {
  Arrays: {
    intro: "Arrays store values in an ordered sequence. Learn to scan, compare, and reuse information efficiently.",
    concepts: [
      { title: "Traversal", detail: "Move through an array using indices and loops." },
      { title: "Hash maps", detail: "Store previously seen values for quick lookups." },
      { title: "Two pointers", detail: "Use two moving indices instead of nested loops." },
      { title: "Sliding windows", detail: "Track a contiguous range while updating results efficiently." },
    ],
  },
  Stack: {
    intro: "Stacks process items last-in, first-out. They're ideal for nested structures and reversing order.",
    concepts: [
      { title: "Push and pop", detail: "Add to and remove from the top of a stack." },
      { title: "LIFO reasoning", detail: "Recognize problems where the most recent item matters first." },
      { title: "Matching pairs", detail: "Track nested brackets and validate their closing order." },
    ],
  },
  Search: {
    intro: "Search algorithms find values or boundaries. Sorted inputs often let you do better than a full scan.",
    concepts: [
      { title: "Linear search", detail: "Inspect elements one by one and understand O(n)." },
      { title: "Binary search", detail: "Halve the search space after each comparison." },
      { title: "Loop invariants", detail: "Keep clear left/right bounds and stopping conditions." },
      { title: "Edge cases", detail: "Test missing items, single-item arrays, and boundaries." },
    ],
  },
  "Linked Lists": {
    intro: "Linked lists connect nodes using references instead of contiguous indices.",
    concepts: [
      { title: "Nodes and pointers", detail: "Read val and next to move between nodes." },
      { title: "Traversal", detail: "Follow next pointers until reaching null." },
      { title: "Relinking", detail: "Rearrange next pointers without losing nodes." },
      { title: "Dummy heads", detail: "Simplify operations at the start of a list." },
    ],
  },
  Graphs: {
    intro: "Graphs represent connections. Grid-based problems often hide graph traversal underneath.",
    concepts: [
      { title: "Vertices and edges", detail: "Model entities and their connections." },
      { title: "Depth-first search", detail: "Follow one path fully before backtracking." },
      { title: "Breadth-first search", detail: "Explore neighbors one layer at a time." },
      { title: "Visited tracking", detail: "Avoid revisiting nodes or cells." },
    ],
  },
};
const storageKey = "rock-em:topic-concepts:v1";

function readProgress(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].every((item) => typeof item === "string")),
    );
  } catch {
    return {};
  }
}

export default function TopicLearningPath({ topic, problems, completedIds, onOpenProblem }: Props) {
  const [progress, setProgress] = useState<Record<string, string[]>>(readProgress);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // In private browsing, storage may be unavailable. The feature still works in-session.
    }
  }, [progress]);

  const guide = guides[topic] ?? {
    intro: `Practice ${topic} with a focused learning checklist and coding exercises.`,
    concepts: [
      { title: "Understand the fundamentals", detail: `Identify the important ideas behind ${topic}.` },
      { title: "Trace a small example", detail: "Work through input and output by hand." },
      { title: "Analyze efficiency", detail: "Consider the time and memory required by your solution." },
      { title: "Try edge cases", detail: "Test empty, minimal, and unusual inputs when applicable." },
    ],
  };

  const checked = progress[topic] ?? [];
  const conceptCount = guide.concepts.filter((concept) => checked.includes(concept.title)).length;
  const solvedCount = problems.filter((p) => completedIds.includes(p.id)).length;
  const conceptPercent = Math.round((conceptCount / guide.concepts.length) * 100);
  const problemPercent = problems.length ? Math.round((solvedCount / problems.length) * 100) : 0;
  const mastery = Math.round((conceptPercent + problemPercent) / 2);
  const next = [...problems]
    .filter((p) => !completedIds.includes(p.id))
    .sort((a, b) => ({ Easy: 0, Medium: 1, Hard: 2 }[a.difficulty] - { Easy: 0, Medium: 1, Hard: 2 }[b.difficulty]))[0];

  function toggleConcept(title: string) {
    setProgress((previous) => {
      const values = previous[topic] ?? [];
      return {
        ...previous,
        [topic]: values.includes(title) ? values.filter((v) => v !== title) : [...values, title],
      };
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
        <span>{conceptCount}/{guide.concepts.length} concepts learned</span>
        <span>{solvedCount}/{problems.length} problems solved</span>
      </div>

      <button type="button" className="learning-path-toggle" aria-expanded={expanded} onClick={() => setExpanded((previous) => !previous)}>
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
          {next && <span>{next.difficulty} · {topic}</span>}
        </div>
        {next && <button type="button" onClick={() => onOpenProblem(next.id)}>Practice →</button>}
      </div>
    </div>
  );
}
