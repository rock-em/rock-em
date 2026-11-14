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
    expect(fromDetail(detail).output).toBeUndefined();
  });

  it("points the runner at the argument an in-place problem changes", () => {
    const detail = {
      slug: "remove-element",
      title: "Remove Element",
      shortDescription: "Remove val in place.",
      difficulty: "easy",
      category: "Array",
      topics: ["Array"],
      description: "Remove every val from nums.",
      constraints: [],
      signature: {
        function: "removeElement",
        params: [
          { name: "nums", type: "int[]" },
          { name: "val", type: "int" },
        ],
        returns: "int",
        output: "nums",
      },
      compare: "unordered",
      examples: [],
      tests: [{ args: [[3, 2, 2, 3], 3], expected: [2, 2] }],
      language: "javascript",
      functionName: "removeElement",
      starter: "function removeElement(nums, val) {}",
      indentUnit: "  ",
    } as ProblemDetail;

    expect(fromDetail(detail).output).toEqual({ index: 0, prefix: true });
    expect(fromDetail({ ...detail, signature: { ...detail.signature, returns: "void" } }).output).toEqual({
      index: 0,
      prefix: false,
    });
  });
});
