import { useMemo } from "react";
import { Link } from "../../lib/Link";
import { navigate, useQuery } from "../../lib/router";
import { usePractice } from "../practice/context";
import { difficulties, difficultyLabel, type Difficulty, type ProblemListItem } from "../problems/model";
import { TopicLearningPath } from "./TopicLearningPath";
import "./LearnPage.css";

const LADDER_STEPS = 6;
const pathHref = (topic: string) => `/learn?${new URLSearchParams({ topic })}`;
const browseHref = (topic: string, difficulty: Difficulty) => `/?${new URLSearchParams({ topic, difficulty })}`;

type TopicSummary = { name: string; solved: number; byDifficulty: Record<Difficulty, number> };

export function LearnPage() {
  const { problems, topics, solved } = usePractice();
  const selected = useQuery().get("topic");
  const topic = topics.find((item) => item.name === selected);

  const summaries = useMemo(() => {
    const byName = new Map<string, TopicSummary>(
      topics.map(({ name }) => [name, { name, solved: 0, byDifficulty: { easy: 0, medium: 0, hard: 0 } }]),
    );
    for (const problem of problems) {
      for (const name of problem.topics) {
        const summary = byName.get(name)!;
        summary.byDifficulty[problem.difficulty]++;
        if (solved.has(problem.id)) summary.solved++;
      }
    }
    return byName;
  }, [problems, topics, solved]);

  if (topic) {
    const inTopic = problems.filter((problem) => problem.topics.includes(topic.name));
    return (
      <main className="page utility-page">
        <Link href="/learn">← All learning paths</Link>
        <h1 className="learn-title">{topic.name}</h1>
        <TopicLearningPath
          key={topic.name}
          topic={topic.name}
          problems={inTopic}
          solved={solved}
          onOpenProblem={(id) => navigate(`/problems/${id}`)}
        />
        <h2>Practice ladder</h2>
        <p className="muted">Work up from easy to hard. Each step shows what to try next.</p>
        {difficulties.map((difficulty) => (
          <Ladder
            key={difficulty}
            topic={topic.name}
            difficulty={difficulty}
            problems={inTopic.filter((problem) => problem.difficulty === difficulty)}
            solved={solved}
          />
        ))}
      </main>
    );
  }

  return (
    <main className="page utility-page">
      <h1>Learning paths</h1>
      <p className="muted">
        Pick a topic to get its key concepts and a ladder of problems from easy to hard. A problem counts toward every
        topic it is tagged with.
      </p>
      {selected && <p role="status">There is no learning path for “{selected}”. Choose one below.</p>}
      <table className="plain-table topic-table">
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col" className="numeric">
              Easy
            </th>
            <th scope="col" className="numeric">
              Medium
            </th>
            <th scope="col" className="numeric">
              Hard
            </th>
            <th scope="col" className="numeric">
              Solved
            </th>
          </tr>
        </thead>
        <tbody>
          {topics.map(({ name, count }) => {
            const summary = summaries.get(name)!;
            return (
              <tr key={name}>
                <td>
                  <Link href={pathHref(name)}>{name}</Link>
                </td>
                {difficulties.map((difficulty) => (
                  <td key={difficulty} className="numeric muted">
                    {summary.byDifficulty[difficulty]}
                  </td>
                ))}
                <td className="numeric">
                  {summary.solved} / {count}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}

type LadderProps = {
  topic: string;
  difficulty: Difficulty;
  problems: ProblemListItem[];
  solved: ReadonlySet<string>;
};

function Ladder({ topic, difficulty, problems, solved }: LadderProps) {
  if (problems.length === 0) return null;
  const done = problems.filter((problem) => solved.has(problem.id)).length;
  const next = problems.filter((problem) => !solved.has(problem.id)).slice(0, LADDER_STEPS);
  return (
    <div className="ladder">
      <h3>
        <span className={`difficulty-${difficulty}`}>{difficultyLabel[difficulty]}</span>
        <span className="ladder-count">
          {done} / {problems.length} solved
        </span>
      </h3>
      <div className="meter" aria-hidden="true">
        <span style={{ width: `${(done / problems.length) * 100}%` }} />
      </div>
      {next.length === 0 ? (
        <p className="muted">All solved.</p>
      ) : (
        <ol>
          {next.map((problem) => (
            <li key={problem.id}>
              <Link href={`/problems/${problem.id}`}>{problem.title}</Link>
            </li>
          ))}
        </ol>
      )}
      {problems.length > next.length && (
        <Link href={browseHref(topic, difficulty)}>
          All {problems.length} {difficultyLabel[difficulty].toLowerCase()} {topic} problems →
        </Link>
      )}
    </div>
  );
}
