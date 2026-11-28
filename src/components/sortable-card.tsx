"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import type { CardId } from "@/lib/card-order";
import { HudPanel } from "@/components/hud-panel";

interface SortableCardProps {
  id: CardId;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * A dashboard card the player can drag to another place. The grip in its corner does
 * the dragging, by pointer or by keyboard, so the rest of the card stays free for
 * reading and tapping.
 */
export function SortableCard({ id, title, actions, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      data-card={id}
      data-dragging={isDragging ? "true" : "false"}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : undefined,
      }}
    >
      <HudPanel
        title={title}
        actions={actions}
        collapsible
        dragHandle={
          <button
            type="button"
            className="btn btn--icon card-grip"
            {...attributes}
            {...listeners}
            // Keeps a touch drag on the grip from scrolling the page instead.
            style={{ touchAction: "none" }}
            // And keeps a press on the grip from starting a native drag of selected text,
            // which would swallow the pointer events before the card can move.
            onDragStart={(event) => event.preventDefault()}
            aria-label={`Change where the ${title.toLowerCase()} card sits`}
            title="Drag to move this card. With a keyboard: press space to pick it up, the arrow keys to move it, and space to put it down."
          >
            <GripVertical aria-hidden="true" />
          </button>
        }
      >
        {children}
      </HudPanel>
    </div>
  );
}
