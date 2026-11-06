import { useState } from "react";
import { draftKey, usePractice } from "../practice/context";
import type { Problem } from "../problems/model";
import { recordAttempt } from "../progress/attempts";
import { LanguageSelect } from "./LanguageSelect";
import { LazyCodeEditor } from "./LazyCodeEditor";
import { allPassed, runTests, type TestResult } from "./runner";
import { TestResults } from "./TestResults";

type Props = {
  problem: Problem;
  languages: string[];
  onLanguageChange: (language: string) => void;
};

type Run = { key: string; results: TestResult[] | null; message: string };

function outcome(submitted: boolean, passed: boolean) {
  if (submitted) return passed ? "All sample tests passed. Marked as solved for this session." : "Not quite yet. Review the failed tests and try again.";
  return passed ? "All sample tests passed! Ready to submit." : "Some tests failed. Check the results below.";
}

export function SolutionPanel({ problem, languages, onLanguageChange }: Props) {
  const { drafts, setDraft, markSolved } = usePractice();
  const key = draftKey(problem);
  const code = drafts[key] ?? problem.starter;
  const [run, setRun] = useState<Run | null>(null);
  const [running, setRunning] = useState(false);
  const visible = run?.key === key ? run : null;
  const runnable = problem.language === "javascript" && problem.tests.length > 0;

  function edit(next: string) {
    setDraft(key, next);
    setRun(null);
  }

  async function check(submitted: boolean) {
    if (!runnable || running) return;
    setRunning(true);
    setRun({ key, results: null, message: "" });
    try {
      const results = await runTests(problem, code);
      const passed = allPassed(results, problem.tests.length);
      if (submitted && results.length > 0) recordAttempt(problem.id, passed);
      if (submitted && passed) markSolved(problem.id);
      setRun({ key, results, message: outcome(submitted, passed) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="workspace-panel editor-panel">
      <div className="editor-heading">
        <div>
          <strong>Your solution</strong>
          <LanguageSelect languages={languages} value={problem.language} onChange={onLanguageChange} />
        </div>
        <button className="reset-button" onClick={() => edit(problem.starter)}>
          Reset code
        </button>
      </div>
      <LazyCodeEditor
        key={key}
        className="code-editor"
        label={`${problem.language} solution`}
        language={problem.language}
        indentUnit={problem.indentUnit}
        value={code}
        onChange={edit}
      />
      <div className="editor-actions">
        <button className="run-button" disabled={running || !runnable} onClick={() => void check(false)}>
          {running ? "Running…" : "Run tests"}
        </button>
        <button className="submit-button" disabled={running || !runnable} onClick={() => void check(true)}>
          Submit →
        </button>
      </div>
      {visible?.message && (
        <p className="test-message" role="status">
          {visible.message}
        </p>
      )}
      {visible?.results && <TestResults results={visible.results} />}
      <p className="runner-note">
        {problem.language === "javascript"
          ? "Local sample runner: compares JSON return values exactly. Custom data structures and alternate valid outputs need a full judge."
          : "You can read and edit this language. Running tests is currently available for JavaScript only."}
      </p>
    </section>
  );
}
