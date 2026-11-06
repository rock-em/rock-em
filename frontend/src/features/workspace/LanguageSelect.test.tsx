import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageSelect } from "./LanguageSelect";

afterEach(cleanup);
const languages = ["python", "julia"];

describe("LanguageSelect", () => {
  it("renders only the problem's available languages and preserves controlled selection", () => {
    const onChange = vi.fn();
    render(<LanguageSelect languages={languages} value="python" onChange={onChange} />);
    expect(screen.queryByRole("option", { name: "JavaScript" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("python");
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "julia" } });
    expect(onChange).toHaveBeenCalledWith("julia");
  });

  it("clears an unavailable selection and disables an empty picker", () => {
    render(<LanguageSelect languages={[]} value="python" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Language")).toBeDisabled();
    expect(screen.getByLabelText("Language")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("No languages");
  });
});
