import { difficultyLabel, type Problem } from "../problems/model";
import { LazyCodeEditor } from "./LazyCodeEditor";

export function ProblemStatement({ problem, solved }: { problem: Problem; solved: boolean }) {
  return (
    <section className="workspace-panel description-panel">
      <div className="workspace-eyebrow">
        {problem.topic}
        {problem.generated && " · Generated"}
      </div>
      <h1>{problem.title}</h1>
      <span className="problem-difficulty">{difficultyLabel[problem.difficulty]}</span>
      {solved && <span className="solved-label">✓ Solved</span>}
      <p className="problem-description">{problem.description}</p>

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
              <b>Explanation:</b> {example.explanation}
            </div>
          )}
        </div>
      ))}

      <h2>Constraints</h2>
      <ul className="constraints">
        {problem.constraints.map((constraint) => (
          <li key={constraint}>{constraint}</li>
        ))}
      </ul>

      {problem.referenceSolution && (
        <details className="reference-solution">
          <summary>Reference solution</summary>
          <LazyCodeEditor key={problem.language} className="code-block" label="Reference solution" language={problem.language} value={problem.referenceSolution} readOnly />
        </details>
      )}
    </section>
  );
}
