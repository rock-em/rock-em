import { describe, expect, it } from "vitest";
import { allPassed, compareKey, formatValue } from "./runner";

describe("compareKey", () => {
  it("compares exactly by default", () => {
    expect(compareKey([1, 2], false)).not.toBe(compareKey([2, 1], false));
    expect(compareKey({ a: 1 }, false)).toBe(compareKey({ a: 1 }, false));
  });

  it("ignores array order when the problem compares unordered", () => {
    expect(compareKey([[1, 2], [3]], true)).toBe(compareKey([[3], [1, 2]], true));
    expect(compareKey([[1, 2]], true)).not.toBe(compareKey([[2, 1]], true));
  });
});

describe("allPassed", () => {
  it("requires a passing result for every expected test", () => {
    const pass = { passed: true, input: [], expected: 1 };
    expect(allPassed([pass, pass], 2)).toBe(true);
    expect(allPassed([pass], 2)).toBe(false);
    expect(allPassed([pass, { ...pass, passed: false }], 2)).toBe(false);
  });
});

describe("formatValue", () => {
  it("shows undefined and unserialisable values instead of throwing", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(formatValue(undefined)).toBe("undefined");
    expect(formatValue([1, "a"])).toBe('[1,"a"]');
    expect(formatValue(cyclic)).toBe("[object Object]");
  });
});
