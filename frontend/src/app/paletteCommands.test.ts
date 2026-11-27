import { describe, expect, it } from "vitest";
import { moveSelection, paletteCommands, searchCommands } from "./paletteCommands";

describe("command palette search", () => {
  it("returns all destinations for an empty query", () => {
    expect(searchCommands("  ")).toEqual(paletteCommands);
  });

  it("matches keywords regardless of case", () => {
    expect(searchCommands("HISTORY").map((command) => command.href)).toEqual(["/progress"]);
  });

  it("requires every search word to match", () => {
    expect(searchCommands("custom exercise").map((command) => command.href)).toEqual(["/generate"]);
  });

  it("returns no results for an unknown term", () => {
    expect(searchCommands("unavailable-command")).toEqual([]);
  });
});

describe("keyboard selection", () => {
  it("wraps at the end", () => expect(moveSelection(4, 1, 5)).toBe(0));
  it("wraps at the beginning", () => expect(moveSelection(0, -1, 5)).toBe(4));
  it("handles an empty result list", () => expect(moveSelection(0, 1, 0)).toBe(0));
});
