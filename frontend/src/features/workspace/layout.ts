import { createContext, useContext } from "react";

export type PaneId = "description" | "code" | "tests";

// The three places a pane can sit, as grid areas: one tall pane on the left
// and two stacked on the right.
export const SLOTS = ["pane-left", "pane-top", "pane-bottom"] as const;

// x is the left pane's width and y the top-right pane's height, as
// percentages. order[i] is the pane shown in SLOTS[i].
export type Layout = { x: number; y: number; order: PaneId[] };

export const LAYOUT_KEY = "rock-em:workspace-layout:v1";
export const DEFAULT_LAYOUT: Layout = { x: 44, y: 64, order: ["description", "code", "tests"] };
export const MIN_SPLIT = 15;
export const MAX_SPLIT = 85;

export const clampSplit = (value: number) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));

function validOrder(order: unknown): order is PaneId[] {
  return (
    Array.isArray(order) &&
    order.length === DEFAULT_LAYOUT.order.length &&
    DEFAULT_LAYOUT.order.every((pane) => order.includes(pane))
  );
}

export function savedLayout(): Layout {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null") as Partial<Layout> | null;
    if (typeof saved?.x === "number" && typeof saved.y === "number") {
      return {
        x: clampSplit(saved.x),
        y: clampSplit(saved.y),
        order: validOrder(saved.order) ? saved.order : DEFAULT_LAYOUT.order,
      };
    }
  } catch {
    // Unreadable or missing storage falls back to the default layout.
  }
  return DEFAULT_LAYOUT;
}

export function swapPanes(order: PaneId[], a: PaneId, b: PaneId): PaneId[] {
  return order.map((pane) => (pane === a ? b : pane === b ? a : pane));
}

export type PaneArrangement = {
  order: PaneId[];
  /** The pane being dragged, if any. */
  dragging: PaneId | null;
  setDragging: (pane: PaneId | null) => void;
  swap: (a: PaneId, b: PaneId) => void;
};

export const PaneArrangementContext = createContext<PaneArrangement | null>(null);

export function usePaneArrangement(): PaneArrangement {
  const arrangement = useContext(PaneArrangementContext);
  if (!arrangement) throw new Error("Pane must be rendered inside the workspace");
  return arrangement;
}
