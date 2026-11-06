import type { components } from "../../api/schema";
import type { ProblemDetail, ProblemSummary } from "./api";

export type Difficulty = components["schemas"]["Difficulty"];
export type Compare = components["schemas"]["Compare"];
export type Example = { input: string; output: string; explanation?: string };
export type TestCase = { input: unknown[]; expected: unknown };

export type ProblemListItem = {
  id: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
};

export type Problem = ProblemListItem & {
  language: string;
  description: string;
  examples: Example[];
  constraints: string[];
  functionName: string;
  starter: string;
  tests: TestCase[];
  compare?: Compare;
  indentUnit?: string;
  referenceSolution?: string;
  generated?: boolean;
};

export const difficultyLabel: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export const difficultyOrder: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export function chooseLanguage(languages: string[], preferred?: string | null): string | null {
  if (preferred && languages.includes(preferred)) return preferred;
  return languages.includes("python") ? "python" : null;
}

export function fromSummary(summary: ProblemSummary): ProblemListItem {
  return { id: summary.slug, title: summary.title, topic: summary.category, difficulty: summary.difficulty };
}

const show = (value: unknown) => JSON.stringify(value);

export function fromDetail(detail: ProblemDetail): Problem {
  return {
    ...fromSummary(detail),
    language: detail.language,
    description: detail.description,
    constraints: detail.constraints,
    functionName: detail.functionName,
    starter: detail.starter,
    compare: detail.compare,
    indentUnit: detail.indentUnit,
    examples: detail.examples.map((example) => ({
      input: detail.signature.params.map((param, index) => `${param.name} = ${show(example.args[index])}`).join(", "),
      output: show(example.expected),
      explanation: example.explanation,
    })),
    tests: detail.tests.map((test) => ({ input: test.args, expected: test.expected })),
  };
}
