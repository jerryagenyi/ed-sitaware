// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CARD_ORDER,
  isCardId,
  isDefaultCardOrder,
  moveCard,
  sanitiseCardOrder,
} from "./card-order";

describe("card order", () => {
  it("starts with where you are, then the widget that answers from the journal, then the rest", () => {
    expect(DEFAULT_CARD_ORDER.slice(0, 3)).toEqual(["system", "station", "hazard_alerts"]);
    // Two cards about where you are, and one for each of the eight widgets.
    expect(DEFAULT_CARD_ORDER).toHaveLength(10);
    expect(isDefaultCardOrder(DEFAULT_CARD_ORDER)).toBe(true);
  });

  it("moves a card forwards and backwards", () => {
    const order = ["system", "station", "hazard_alerts"] as const;
    expect(moveCard(order, "system", "hazard_alerts")).toEqual(["station", "hazard_alerts", "system"]);
    expect(moveCard(order, "hazard_alerts", "system")).toEqual(["hazard_alerts", "system", "station"]);
  });

  it("gives back the same order when nothing would move", () => {
    const order = [...DEFAULT_CARD_ORDER];
    expect(moveCard(order, "system", "system")).toEqual(order);
    expect(moveCard(order, "not-a-card", "station")).toEqual(order);
    expect(moveCard(order, "system", "not-a-card")).toEqual(order);
    expect(order).toEqual([...DEFAULT_CARD_ORDER]);
  });

  it("drops ids that are no longer cards, and adds cards that arrived since, at the end", () => {
    const rest = DEFAULT_CARD_ORDER.filter((id) => id !== "station");
    expect(sanitiseCardOrder(["station", "no-longer-a-card", "station", 7])).toEqual(["station", ...rest]);
    expect(sanitiseCardOrder(["hazard_alerts"])).toEqual(["hazard_alerts", ...DEFAULT_CARD_ORDER.filter((id) => id !== "hazard_alerts")]);
  });

  it("falls back to the starting order when nothing usable was stored", () => {
    for (const junk of [null, undefined, "station", 3, {}]) {
      expect(sanitiseCardOrder(junk)).toEqual([...DEFAULT_CARD_ORDER]);
    }
  });

  it("knows a card id when it sees one", () => {
    expect(isCardId("system")).toBe(true);
    expect(isCardId("mining_reserves")).toBe(true);
    expect(isCardId("light")).toBe(false);
    expect(isCardId("System")).toBe(false);
  });
});
