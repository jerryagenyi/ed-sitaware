/**
 * Storage keys and defaults that both the server-rendered theme script and the client
 * stores need. Kept free of imports so the root layout can use it.
 */

export const THEMES = ["amber", "cyan", "slate", "light"] as const;

export type ThemeId = (typeof THEMES)[number];

export const DEFAULT_THEME_ID: ThemeId = "amber";

export const SETTINGS_STORAGE_KEY = "ed-sitaware:settings";

/** A `data-theme` value that this build knows how to draw. */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}
