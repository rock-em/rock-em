import type { components } from "../../api/schema";
import type { ProblemDetail } from "./api";

export type Difficulty = components["schemas"]["Difficulty"];

export const difficultyLabel: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export const difficultyOrder: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export function chooseLanguage(languages: string[], preferred?: string | null): string | null {
  if (preferred && languages.includes(preferred)) return preferred;
  return languages.includes("python") ? "python" : null;
}

const show = (value: unknown) => JSON.stringify(value);

export function toPracticeFields(detail: ProblemDetail) {
  return {
    examples: detail.examples.map((example) => ({
      input: detail.signature.params.map((param, index) => `${param.name} = ${show(example.args[index])}`).join(", "),
      output: show(example.expected),
      explanation: example.explanation,
    })),
    tests: detail.tests.map((test) => ({ input: test.args, expected: test.expected })),
  };
}
