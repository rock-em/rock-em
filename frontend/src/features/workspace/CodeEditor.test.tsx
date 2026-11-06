import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CodeEditor } from "./CodeEditor";

describe("CodeEditor", () => {
  it("renders the document under an accessible label and follows external replacements", async () => {
    const { rerender } = render(
      <CodeEditor
        label="python solution"
        language="python"
        value={"def solve(value):\n    pass"}
        onChange={() => {}}
      />,
    );
    const editor = screen.getByRole("textbox", { name: "python solution" });
    expect(editor).toHaveTextContent("def solve(value):");
    rerender(<CodeEditor label="python solution" language="python" value="reset" onChange={() => {}} />);
    await waitFor(() => expect(editor).toHaveTextContent("reset"));
  });

  it("is not editable in read-only mode", () => {
    render(<CodeEditor label="Reference solution" language="javascript" value="function solve() {}" readOnly />);
    expect(screen.getByLabelText("Reference solution")).toHaveAttribute("contenteditable", "false");
  });

  it("falls back to plain text for languages without a grammar", () => {
    render(<CodeEditor label="julia solution" language="julia" value="function solve() end" />);
    expect(screen.getByRole("textbox", { name: "julia solution" })).toHaveTextContent("function solve() end");
  });
});
