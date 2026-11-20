import { useState } from "react";
import { draftKey, usePractice } from "../practice/context";
import type { Problem } from "../problems/model";
import { recordAttempt } from "../progress/attempts";
import { allPassed, runTests, type TestResult } from "./runner";

export type Run = { key: string; results: TestResult[] | null; message: string };

function outcome(submitted: boolean, passed: boolean) {
  if (submitted && passed) return "All sample tests passed. Marked as solved.";
  if (submitted) return "Not quite yet. Review the failed tests and try again.";
  return passed ? "All sample tests passed! Ready to submit." : "Some tests failed. Check the results below.";
}

/** The draft for a problem and the state of running it against the sample tests. */
export function useSolution(problem: Problem | undefined) {
  const { drafts, setDraft, markSolved } = usePractice();
  const [run, setRun] = useState<Run | null>(null);
  const [running, setRunning] = useState(false);
  const key = problem ? draftKey(problem) : "";
  const code = problem ? (drafts[key] ?? problem.starter) : "";
  const runnable = problem?.language === "javascript" && problem.tests.length > 0;

  function edit(next: string) {
    setDraft(key, next);
    setRun(null);
  }

  async function check(submitted: boolean) {
    if (!problem || !runnable || running) return;
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

  return { key, code, edit, check, running, runnable, run: run?.key === key ? run : null };
}
