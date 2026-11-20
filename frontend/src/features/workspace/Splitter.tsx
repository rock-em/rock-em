import type { KeyboardEvent, PointerEvent } from "react";
import { clampSplit, MAX_SPLIT, MIN_SPLIT } from "./layout";

type Props = {
  /** "x" divides left from right, "y" divides top from bottom. */
  axis: "x" | "y";
  label: string;
  /** Size of the pane before the splitter, as a percentage of the container. */
  value: number;
  onChange: (value: number) => void;
  onReset: () => void;
};

const KEY_STEP = 2;

export function Splitter({ axis, label, value, onChange, onReset }: Props) {
  function drag(event: PointerEvent<HTMLDivElement>) {
    const bar = event.currentTarget;
    if (!bar.hasPointerCapture(event.pointerId)) return;
    const box = bar.parentElement!.getBoundingClientRect();
    const ratio = axis === "x" ? (event.clientX - box.left) / box.width : (event.clientY - box.top) / box.height;
    onChange(clampSplit(ratio * 100));
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const back = axis === "x" ? "ArrowLeft" : "ArrowUp";
    const forward = axis === "x" ? "ArrowRight" : "ArrowDown";
    if (event.key !== back && event.key !== forward) return;
    event.preventDefault();
    onChange(clampSplit(value + (event.key === forward ? KEY_STEP : -KEY_STEP)));
  }

  return (
    <div
      className={`splitter splitter-${axis}`}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-valuemin={MIN_SPLIT}
      aria-valuemax={MAX_SPLIT}
      aria-valuenow={Math.round(value)}
      title="Drag to resize. Double-click to reset."
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus();
      }}
      onPointerMove={drag}
      onDoubleClick={onReset}
      onKeyDown={nudge}
    />
  );
}
