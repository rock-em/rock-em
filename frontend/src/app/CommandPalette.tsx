import { useEffect, useRef, useState } from "react";
import { navigate } from "../lib/router";
import { moveSelection, searchCommands } from "./paletteCommands";
import "./CommandPalette.css";

export function CommandPalette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const results = searchCommands(query);

  function open() {
    if (!dialog.current || dialog.current.open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery("");
    setIndex(0);
    dialog.current.showModal();
    input.current?.focus();
  }

  function close() {
    dialog.current?.close();
  }

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else trigger.current?.click();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  function select(href: string) {
    close();
    navigate(href);
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="palette-trigger"
        onClick={open}
        aria-label="Open command palette"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <span>Quick jump</span>
        <kbd>Ctrl / ⌘ K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="command-palette"
        aria-label="Quick navigation"
        onClose={() => previousFocus.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIndex((current) => moveSelection(current, event.key === "ArrowDown" ? 1 : -1, results.length));
            input.current?.focus();
          }
        }}
      >
        <div className="palette-content">
          <div className="palette-search">
            <input
              ref={input}
              aria-label="Search navigation commands"
              placeholder="Jump to a page…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[index]) {
                  event.preventDefault();
                  select(results[index].href);
                }
              }}
            />
            <button type="button" onClick={close} aria-label="Close command palette">
              Esc
            </button>
          </div>
          <p className="palette-caption" aria-live="polite">
            {results.length} {results.length === 1 ? "destination" : "destinations"}
          </p>
          <div className="palette-results">
            {results.map((command, position) => (
              <button
                key={command.href}
                type="button"
                className="palette-result"
                data-active={position === index}
                onMouseEnter={() => setIndex(position)}
                onFocus={() => setIndex(position)}
                onClick={() => select(command.href)}
              >
                <span>
                  <strong>{command.label}</strong>
                  <small>{command.description}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
            {results.length === 0 && <p className="palette-empty">No matching pages. Try a different search.</p>}
          </div>
          <div className="palette-footer">
            <span>↑ ↓ Navigate</span>
            <span>Enter Open</span>
            <span>Esc Close</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
