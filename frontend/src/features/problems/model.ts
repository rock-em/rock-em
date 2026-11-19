import type { components } from "../../api/schema";
import type { Catalog, ProblemDetail } from "./api";

export type Difficulty = components["schemas"]["Difficulty"];
export type Compare = components["schemas"]["Compare"];
export type Example = { input: string; output: string; explanation?: string };
export type TestCase = { input: unknown[]; expected: unknown };

export type ProblemListItem = {
  id: string;
  title: string;
  /** The primary topic, also the first entry of topics. */
  topic: string;
  topics: string[];
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

export const difficulties: Difficulty[] = ["easy", "medium", "hard"];

export function fromCatalog(catalog: Catalog): ProblemListItem[] {
  return catalog.problems.map((problem) => {
    const topics = problem.topics.map((index) => catalog.topics[index]?.name).filter((name) => name !== undefined);
    return {
      id: problem.slug,
      title: problem.title,
      topic: topics[0] ?? "",
      topics,
      difficulty: problem.difficulty,
    };
  });
}

const show = (value: unknown) => JSON.stringify(value);

export function fromDetail(detail: ProblemDetail): Problem {
  return {
    id: detail.slug,
    title: detail.title,
    topic: detail.category,
    topics: detail.topics.length ? detail.topics : [detail.category],
    difficulty: detail.difficulty,
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
