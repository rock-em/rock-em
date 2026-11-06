import type { Problem } from "../problems/model";
import { runTests } from "../workspace/runner";
import type { GeneratedProblem } from "./api";

const MIN_VERIFIED_TESTS = 3;

export async function toVerifiedProblem(generated: GeneratedProblem): Promise<Problem> {
  const { referenceSolution, ...fields } = generated;
  const problem: Problem = { ...fields, referenceSolution, id: `generated-${crypto.randomUUID()}`, language: "javascript", generated: true };
  const results = await runTests(problem, referenceSolution);
  const tests = problem.tests.filter((_, index) => results[index]?.passed);
  if (tests.length < MIN_VERIFIED_TESTS) throw new Error("The generated test cases did not check out. Please try again.");
  return { ...problem, tests };
}
