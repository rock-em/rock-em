import type { components } from "./api/schema";

export type Level = "beginner" | "intermediate" | "advanced";

export type GenerateRequest = { topic: string; theme: string; level: Level };

export type GeneratedProblem = {
  title: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  functionName: string;
  starter: string;
  referenceSolution: string;
  tests: { input: unknown[]; expected: unknown }[];
};

export async function generateProblem(request: GenerateRequest): Promise<GeneratedProblem> {
  const response = await fetch("/api/problems/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error("Sign in above to generate a practice problem.");
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }
  const problem = body as components["schemas"]["GeneratedProblem"];
  const labels = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;
  return { ...problem, difficulty: labels[problem.difficulty] };
}
