import { createContext, useContext } from "react";
import type { Problem, ProblemListItem } from "../problems/model";

export type TopicCount = { name: string; count: number };

export type Practice = {
  catalog: { loading: boolean; error: string; retry: () => void };
  problems: ProblemListItem[];
  /** Every topic any problem is tagged with, most problems first. */
  topics: TopicCount[];
  generated: Problem[];
  addGenerated: (problem: Problem) => void;
  drafts: Record<string, string>;
  setDraft: (key: string, code: string) => void;
  solved: ReadonlySet<string>;
  markSolved: (id: string) => void;
  languages: Record<string, string>;
  setLanguage: (problemId: string, language: string) => void;
};

export const PracticeContext = createContext<Practice | null>(null);

export function usePractice() {
  const practice = useContext(PracticeContext);
  if (!practice) throw new Error("usePractice must be used inside PracticeProvider");
  return practice;
}

export function draftKey(problem: Pick<Problem, "id" | "language">) {
  return `${problem.id}:${problem.language}`;
}
