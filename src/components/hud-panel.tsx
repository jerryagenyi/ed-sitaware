"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

interface HudPanelProps {
  title: string;
  /** Shown at the right of the header: badges, a source tag. */
  actions?: ReactNode;
  /** The grip that drags the card to another place. */
  dragHandle?: ReactNode;
  /** Lets the card fold up on phones, where a page of open cards is a long scroll. */
  collapsible?: boolean;
  children: ReactNode;
}

/** A card in the briefing: a thin frame with two clipped corners. */
export function HudPanel({ title, actions, dragHandle, collapsible = false, children }: HudPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const bodyId = useId();
  const toggleLabel = collapsed ? `Show ${title.toLowerCase()}` : `Hide ${title.toLowerCase()}`;

  return (
    <section className="hud-panel">
      <div className="hud-panel__body">
        <header className="hud-panel__header">
          <h2>{title}</h2>
          <div className="flex flex-none items-center gap-1">
            {actions}
            {dragHandle}
            {collapsible && (
              // Phones only: from tablet width up a card is always open.
              <button
                type="button"
                className="btn btn--icon md:hidden"
                aria-expanded={!collapsed}
                aria-controls={bodyId}
                aria-label={toggleLabel}
                title={toggleLabel}
                onClick={() => setCollapsed((value) => !value)}
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`transition-transform duration-150 ${collapsed ? "" : "rotate-180"}`}
                />
              </button>
            )}
          </div>
        </header>
        <div id={bodyId} className={collapsed ? "hidden md:block" : ""}>
          {children}
        </div>
      </div>
    </section>
  );
}

export interface Fact {
  label: string;
  value: ReactNode;
}

export function Facts({ items, columns = 2 }: { items: Fact[]; columns?: 2 | 3 }) {
  return (
    <dl className={`facts ${columns === 3 ? "md:grid-cols-3" : ""}`}>
      {items.map((item) => (
        <div key={item.label} className="facts__item">
          <dt className="hud-label">{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface StateProps {
  title: string;
  body: ReactNode;
}

/** The text of an empty, waiting or error state. */
export function State({ title, body }: StateProps) {
  return (
    <div className="state">
      <p className="state__title">{title}</p>
      <div className="state__body">{body}</div>
    </div>
  );
}
