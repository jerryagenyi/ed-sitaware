// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatAge, formatInt, formatPopulation, formatPosition } from "./format";

describe("formatInt", () => {
  it("groups thousands", () => {
    expect(formatInt(5000)).toBe("5,000");
    expect(formatInt(8420.4)).toBe("8,420");
    expect(formatInt(19670)).toBe("19,670");
  });

  it("shows a dash for unknown values", () => {
    expect(formatInt(null)).toBe("—");
    expect(formatInt(undefined)).toBe("—");
  });
});

describe("formatPopulation", () => {
  it("compacts large populations into words", () => {
    expect(formatPopulation(2345678901)).toBe("2.3 billion");
    expect(formatPopulation(1876543)).toContain("million");
  });

  it("leaves small populations alone", () => {
    expect(formatPopulation(850)).toBe("850");
  });
});

describe("formatPosition", () => {
  it("prints three short signed coordinates", () => {
    expect(formatPosition([-23.938, 40.875, -1.344])).toBe("-23.94 / 40.88 / -1.34");
    expect(formatPosition([0, 0, 0])).toBe("0 / 0 / 0");
    expect(formatPosition(null)).toBe("—");
  });
});

describe("formatAge", () => {
  const now = Date.parse("2026-11-27T18:30:00Z");

  it("phrases ages the way a player reads them", () => {
    expect(formatAge(now - 1000, now)).toBe("just now");
    expect(formatAge(now - 12000, now)).toBe("12 s ago");
    expect(formatAge(now - 4 * 60_000, now)).toBe("4 min ago");
    expect(formatAge(now - 3 * 3_600_000, now)).toBe("3 h ago");
    expect(formatAge(now - 72 * 3_600_000, now)).toBe("3 d ago");
  });

  it("never reports a negative age", () => {
    expect(formatAge(now + 5000, now)).toBe("just now");
  });

  it("shows a dash when nothing has been received", () => {
    expect(formatAge(null, now)).toBe("—");
  });
});
