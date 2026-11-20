import { useState, type ReactNode } from "react";
import { SLOTS, usePaneArrangement, type PaneId } from "./layout";

// A custom type, so dropping a pane on the editor never pastes text into it.
const DRAG_TYPE = "application/x-rock-em-pane";

type Props = { id: PaneId; label: string; header?: ReactNode; children: ReactNode };

/**
 * One of the three workspace panes. Dragging its header onto another pane
 * swaps the two; the move button does the same with the next pane along.
 */
export function Pane({ id, label, header, children }: Props) {
  const { order, dragging, setDragging, swap } = usePaneArrangement();
  const [over, setOver] = useState(false);
  const position = order.indexOf(id);
  const droppable = dragging !== null && dragging !== id;

  return (
    <section className={`pane ${id}-pane`} style={{ gridArea: SLOTS[position] }} aria-label={label}>
      <div
        className="pane-header"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(DRAG_TYPE, id);
          setDragging(id);
        }}
        onDragEnd={() => setDragging(null)}
      >
        <button
          type="button"
          className="pane-grip"
          aria-label={`Move ${label} pane`}
          title="Drag the header onto another pane to swap them. Click to swap with the next pane."
          onClick={() => swap(id, order[(position + 1) % order.length])}
        >
          ⠿
        </button>
        <strong>{label}</strong>
        {header}
      </div>
      {children}
      {droppable && (
        // Covers the pane while another one is dragged, so the drop lands here
        // and not on the editor or the text underneath.
        <div
          className={`pane-drop${over ? " pane-drop-over" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            swap(dragging, id);
            setDragging(null);
          }}
        >
          {over && <span>Swap with {label}</span>}
        </div>
      )}
    </section>
  );
}
