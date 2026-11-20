import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InlineText, Prose } from "./Prose";

describe("Prose", () => {
  it("shows backtick spans as inline code and keeps paragraphs apart", () => {
    const { container } = render(<Prose text={"Given `nums` and `target`.\n\nReturn the sum."} />);
    expect(screen.getAllByText(/nums|target/, { selector: "code" }).map((code) => code.textContent)).toEqual([
      "nums",
      "target",
    ]);
    expect([...container.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      "Given nums and target.",
      "Return the sum.",
    ]);
  });

  it("leaves unpaired backticks and markup as plain text", () => {
    const { container } = render(<InlineText text={"a ` b <b>bold</b>"} />);
    expect(container.querySelector("code, b")).toBeNull();
    expect(container).toHaveTextContent("a ` b <b>bold</b>");
  });
});
