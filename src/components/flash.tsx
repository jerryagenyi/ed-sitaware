import type { ReactNode } from "react";

interface FlashProps {
  /** Changes when the value changes. The highlight restarts each time it does. */
  changeKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * Highlights a value for a moment after it changes, so the eye finds what moved on a
 * dashboard that is otherwise still. A colour wash only, so it is safe with
 * reduced motion switched on.
 */
export function Flash({ changeKey, children, className = "" }: FlashProps) {
  return (
    <span key={changeKey} className={`flash ${className}`.trim()}>
      {children}
    </span>
  );
}
