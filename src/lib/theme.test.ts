// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DARK_COLOURS, isDarkColour, themeForNewVisitor, toggledTheme } from "./theme";

describe("theme", () => {
  it("gives a new visitor whatever the system asks for", () => {
    expect(themeForNewVisitor(true)).toBe("light");
    expect(themeForNewVisitor(false)).toBe("amber");
  });

  it("swaps between light and the dark colour last used", () => {
    expect(toggledTheme("light", "cyan")).toBe("cyan");
    expect(toggledTheme("amber", "cyan")).toBe("light");
    expect(toggledTheme("slate", "cyan")).toBe("light");
  });

  it("knows which themes are the dark colours", () => {
    expect(DARK_COLOURS.map(({ value }) => value)).toEqual(["amber", "cyan", "slate"]);
    expect(isDarkColour("amber")).toBe(true);
    expect(isDarkColour("light")).toBe(false);
    expect(isDarkColour("neon")).toBe(false);
    expect(isDarkColour(undefined)).toBe(false);
  });
});
