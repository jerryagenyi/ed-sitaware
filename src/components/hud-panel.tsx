import type { ReactNode } from "react";

interface HudPanelProps {
  title: string;
  /** Shown at the right of the header: badges, a source tag. */
  actions?: ReactNode;
  children: ReactNode;
}

/** A card in the briefing: a thin frame with two clipped corners. */
export function HudPanel({ title, actions, children }: HudPanelProps) {
  return (
    <section className="hud-panel">
      <div className="hud-panel__body">
        <header className="hud-panel__header">
          <h2>{title}</h2>
          {actions}
        </header>
        {children}
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
