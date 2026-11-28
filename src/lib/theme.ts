import type { ThemeId } from "./storage-keys";

/** The three cockpit colours. They belong to dark mode; light mode has one look. */
export type DarkColour = Exclude<ThemeId, "light">;

export const DARK_COLOURS: readonly { value: DarkColour; label: string }[] = [
  { value: "amber", label: "Amber" },
  { value: "cyan", label: "Cyan" },
  { value: "slate", label: "Slate" },
];

export const DEFAULT_DARK_COLOUR: DarkColour = "amber";

export function isDarkColour(value: unknown): value is DarkColour {
  return typeof value === "string" && DARK_COLOURS.some((colour) => colour.value === value);
}

/** Where the sun and moon button goes next: out of light into the colour last used, or into light. */
export function toggledTheme(theme: ThemeId, darkColour: DarkColour): ThemeId {
  return theme === "light" ? darkColour : "light";
}

/**
 * The theme for someone who has not chosen one. They get the system's own light or
 * dark setting until they pick something, from then on their choice stands.
 */
export function themeForNewVisitor(systemPrefersLight: boolean): ThemeId {
  return systemPrefersLight ? "light" : DEFAULT_DARK_COLOUR;
}

/** What the system asks for. False wherever that cannot be known. */
export function systemPrefersLight(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}
