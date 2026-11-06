import { formatValue, type TestResult } from "./runner";

export function TestResults({ results }: { results: TestResult[] }) {
  const passed = results.filter((result) => result.passed).length;
  return (
    <div className="test-results">
      <h2>
        Test results{" "}
        <span>
          {passed} / {results.length} passed
        </span>
      </h2>
      {results.map((result, index) => (
        <div className={`test-case ${result.passed ? "test-pass" : "test-fail"}`} key={index}>
          <strong>
            {result.passed ? "✓" : "✕"} Test {index + 1}
          </strong>
          <div>
            Input: <code>{formatValue(result.input)}</code>
          </div>
          <div>
            Expected: <code>{formatValue(result.expected)}</code>
          </div>
          {result.error ? (
            <div>
              Error: <code>{result.error}</code>
            </div>
          ) : (
            <div>
              Received: <code>{formatValue(result.actual)}</code>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
