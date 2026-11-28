"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/controls";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  /** The action being checked, in plain words. */
  confirmLabel: string;
  /** The way out. It is also the button that has focus when the dialog opens. */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A question with two answers, for actions that are annoying to undo. Cancel comes
 * first in the tab order, so pressing Enter on a freshly opened dialog keeps things as
 * they are.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className="confirm"
      aria-labelledby={titleId}
      // The Escape key counts as stepping back. (The buttons settle things themselves,
      // so nothing depends on the browser firing this event.)
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div className="confirm__inner">
        <h2 id={titleId} className="text-h3 font-semibold">
          {title}
        </h2>
        <div className="mt-2 text-small leading-relaxed text-muted">{body}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            onClick={() => {
              close();
              onCancel();
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              close();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
