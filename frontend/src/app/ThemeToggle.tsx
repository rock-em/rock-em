import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

// index.html reads the same key before the first paint, so a saved light theme
// never flashes dark. Keep the two in step.
const STORAGE_KEY = "rock-em:theme";
const BACKGROUND: Record<Theme, string> = { dark: "#121314", light: "#ffffff" };

function savedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(savedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BACKGROUND[theme]);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Without storage the choice still applies until the page is closed.
    }
  }, [theme]);

  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`${next === "light" ? "Light" : "Dark"} mode`}
      onClick={() => setTheme(next)}
    >
      <span className="theme-toggle-glyph" aria-hidden="true">
        ◐
      </span>
      <span className="theme-toggle-word">{next === "light" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
