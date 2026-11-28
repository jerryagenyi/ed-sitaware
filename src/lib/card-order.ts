import { WIDGETS, type WidgetId } from "./widgets";

/** Every card on the dashboard has an id: the two that say where you are, then each widget. */
export type CardId = "system" | "station" | WidgetId;

/** Cards in their natural order: where you are first, then each widget, the live ones leading. */
export const DEFAULT_CARD_ORDER: readonly CardId[] = [
  "system",
  "station",
  // What the journal can answer already leads: it is the live part of the briefing.
  "hazard_alerts",
  ...WIDGETS.map((widget) => widget.id).filter((id) => id !== "hazard_alerts"),
];

export function isCardId(value: unknown): value is CardId {
  return typeof value === "string" && (DEFAULT_CARD_ORDER as readonly string[]).includes(value);
}

/**
 * The stored order, made safe to use: ids that are no longer cards are dropped, and
 * cards that arrived since it was stored are added at the end.
 */
export function sanitiseCardOrder(stored: unknown): CardId[] {
  const kept: CardId[] = [];
  if (Array.isArray(stored)) {
    for (const id of stored) {
      if (isCardId(id) && !kept.includes(id)) {
        kept.push(id);
      }
    }
  }
  for (const id of DEFAULT_CARD_ORDER) {
    if (!kept.includes(id)) {
      kept.push(id);
    }
  }
  return kept;
}

/** Move one card to the position another card holds. Gives back the same order if nothing moves. */
export function moveCard(order: readonly CardId[], activeId: string, overId: string): CardId[] {
  const from = order.findIndex((id) => id === activeId);
  const to = order.findIndex((id) => id === overId);
  if (from === -1 || to === -1 || from === to) {
    return [...order];
  }
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function isDefaultCardOrder(order: readonly CardId[]): boolean {
  return (
    order.length === DEFAULT_CARD_ORDER.length &&
    order.every((id, index) => id === DEFAULT_CARD_ORDER[index])
  );
}
