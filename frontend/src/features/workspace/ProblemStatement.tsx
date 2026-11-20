import { difficultyLabel, type Problem } from "../problems/model";
import { LazyCodeEditor } from "./LazyCodeEditor";
import { Pane } from "./Pane";
import { InlineText, Prose } from "./Prose";

export function ProblemStatement({ problem, solved }: { problem: Problem; solved: boolean }) {
  return (
    <Pane
      id="description"
      label="Description"
      header={
        <span className="pane-note">
          {problem.topics.join(" · ")}
          {problem.generated && " · Generated"}
        </span>
      }
    >
      <div className="pane-body">
        <h1>{problem.title}</h1>
        <span className={`problem-difficulty difficulty-${problem.difficulty}`}>
          {difficultyLabel[problem.difficulty]}
        </span>
        {solved && <span className="solved-label">✓ Solved</span>}
        <Prose className="problem-description" text={problem.description} />

        <h2>Examples</h2>
        {problem.examples.map((example, index) => (
          <div className="example" key={index}>
            <strong>Example {index + 1}</strong>
            <div>
              <b>Input:</b> <code>{example.input}</code>
            </div>
            <div>
              <b>Output:</b> <code>{example.output}</code>
            </div>
            {example.explanation && (
              <div>
                <b>Explanation:</b> <InlineText text={example.explanation} />
              </div>
            )}
          </div>
        ))}

        <h2>Constraints</h2>
        <ul className="constraints">
          {problem.constraints.map((constraint) => (
            <li key={constraint}>
              <InlineText text={constraint} />
            </li>
          ))}
        </ul>

        {problem.referenceSolution && (
          <details className="reference-solution">
            <summary>Reference solution</summary>
            <LazyCodeEditor
              key={problem.language}
              className="code-block"
              label="Reference solution"
              language={problem.language}
              value={problem.referenceSolution}
              readOnly
            />
          </details>
        )}
      </div>
    </Pane>
  );
}
