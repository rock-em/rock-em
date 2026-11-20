import type { Problem } from "../problems/model";
import { Pane } from "./Pane";
import { formatValue } from "./runner";
import { TestResults } from "./TestResults";
import type { Run } from "./useSolution";

export function TestPane({ problem, run, running }: { problem: Problem; run: Run | null; running: boolean }) {
  return (
    <Pane
      id="tests"
      label="Tests"
      header={
        <span className="pane-note">
          {problem.tests.length} sample {problem.tests.length === 1 ? "case" : "cases"}
        </span>
      }
    >
      <div className="pane-body">
        {running && <p role="status">Running…</p>}
        {run?.message && (
          <p className="test-message" role="status">
            {run.message}
          </p>
        )}
        {run?.results ? (
          <TestResults results={run.results} />
        ) : (
          problem.tests.map((test, index) => (
            <div className="test-case" key={index}>
              <strong>Case {index + 1}</strong>
              <div>
                Input: <code>{formatValue(test.input)}</code>
              </div>
              <div>
                Expected: <code>{formatValue(test.expected)}</code>
              </div>
            </div>
          ))
        )}
        <p className="runner-note">
          {problem.language === "javascript"
            ? "Local sample runner: compares JSON return values exactly. Custom data structures and alternate valid outputs need a full judge."
            : "You can read and edit this language. Running tests is currently available for JavaScript only."}
        </p>
      </div>
    </Pane>
  );
}
