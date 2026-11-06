import { describe, expect, it } from "vitest";
import type { ProblemDetail } from "./api";
import { chooseLanguage, fromDetail } from "./model";

describe("chooseLanguage", () => {
  it("uses an available preference or advertised default without guessing", () => {
    expect(chooseLanguage(["python", "julia"], "julia")).toBe("julia");
    expect(chooseLanguage(["python", "julia"], "ruby")).toBe("python");
    expect(chooseLanguage(["julia"], "ruby")).toBeNull();
    expect(chooseLanguage([], "python")).toBeNull();
  });
});

describe("fromDetail", () => {
  it("names example arguments by the signature and maps tests to runner input", () => {
    const detail = {
      slug: "two-sum",
      title: "Two Sum",
      shortDescription: "",
      difficulty: "easy",
      category: "Arrays",
      topics: ["Arrays"],
      description: "Find two numbers.",
      constraints: [],
      signature: {
        function: "twoSum",
        params: [
          { name: "nums", type: "int[]" },
          { name: "target", type: "int" },
        ],
        returns: "int[]",
      },
      compare: "unordered",
      examples: [{ args: [[2, 7], 9], expected: [0, 1], explanation: "2 + 7 = 9" }],
      tests: [{ args: [[3, 3], 6], expected: [0, 1] }],
      language: "javascript",
      functionName: "twoSum",
      starter: "function twoSum(nums, target) {}",
      indentUnit: "  ",
    } as ProblemDetail;

    expect(fromDetail(detail)).toMatchObject({
      id: "two-sum",
      topic: "Arrays",
      compare: "unordered",
      examples: [{ input: "nums = [2,7], target = 9", output: "[0,1]", explanation: "2 + 7 = 9" }],
      tests: [{ input: [[3, 3], 6], expected: [0, 1] }],
    });
  });
});
