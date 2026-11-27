import type { PadSize } from "./ships";
import { DEFAULT_WIDGETS, WIDGETS, type WidgetId } from "./widgets";

export const RADIUS = { min: 10, max: 100, step: 5, default: 25 } as const;

/** Supercruise limits a profile can be set to, in light-seconds. 5,000 Ls is the default. */
export const SUPERCRUISE_STEPS = [1000, 2000, 3000, 5000, 10000, 20000, 50000, 100000] as const;
export const DEFAULT_SUPERCRUISE_LS = 5000;

export type PadFilter = "auto" | "any" | "medium" | "large";

export const PAD_FILTERS: readonly { id: PadFilter; label: string; short: string }[] = [
  { id: "auto", label: "Auto, from ship", short: "Auto" },
  { id: "any", label: "Any pad", short: "Any" },
  { id: "medium", label: "Medium or large", short: "M+" },
  { id: "large", label: "Large only", short: "L" },
];

export interface ProfileConfig {
  radiusLy: number;
  maxSupercruiseLs: number;
  padFilter: PadFilter;
  excludeFleetCarriers: boolean;
  enabledWidgets: Record<WidgetId, boolean>;
}

export interface Profile extends ProfileConfig {
  id: string;
  name: string;
  builtIn: boolean;
  blurb: string;
}

export function clampRadius(value: number): number {
  const clamped = Math.min(RADIUS.max, Math.max(RADIUS.min, value));
  return Math.round(clamped / RADIUS.step) * RADIUS.step;
}

export function nearestSupercruiseStep(value: number): number {
  let nearest: number = DEFAULT_SUPERCRUISE_LS;
  for (const step of SUPERCRUISE_STEPS) {
    if (Math.abs(step - value) < Math.abs(nearest - value)) {
      nearest = step;
    }
  }
  return nearest;
}

export function defaultConfig(overrides: Partial<ProfileConfig> = {}): ProfileConfig {
  return {
    radiusLy: RADIUS.default,
    maxSupercruiseLs: DEFAULT_SUPERCRUISE_LS,
    padFilter: "auto",
    excludeFleetCarriers: true,
    enabledWidgets: { ...DEFAULT_WIDGETS },
    ...overrides,
  };
}

function preset(id: string, name: string, blurb: string, overrides: Partial<ProfileConfig>): Profile {
  return { ...defaultConfig(overrides), id, name, blurb, builtIn: true };
}

/** Curated starting templates, never hard locks: every value can be tweaked. */
export const BUILT_IN_PROFILES: readonly Profile[] = [
  preset(
    "preset_general",
    "General / Bubble runner",
    "The everyday briefing: nearby ports, material traders and warnings for the sector.",
    {},
  ),
  preset(
    "preset_trader",
    "Trader & colonisation hauler",
    "Bulk supply and demand within reach, with large pads locked in.",
    {
      radiusLy: 35,
      maxSupercruiseLs: 3000,
      padFilter: "large",
      enabledWidgets: {
        ...DEFAULT_WIDGETS,
        market_opportunities: true,
        interstellar_factors: false,
      },
    },
  ),
  preset(
    "preset_miner",
    "Miner",
    "Pristine rings and reserves, and the nearest ports to sell what you bring back.",
    {
      radiusLy: 30,
      maxSupercruiseLs: 10000,
      enabledWidgets: {
        ...DEFAULT_WIDGETS,
        mining_reserves: true,
        market_opportunities: true,
        interstellar_factors: false,
      },
    },
  ),
  preset(
    "preset_combat",
    "Bounty hunter & mercenary",
    "Bounties nearby, someone to cash them with, and the tech brokers to spend on.",
    {
      radiusLy: 20,
      enabledWidgets: { ...DEFAULT_WIDGETS, combat_zones: true, tech_brokers: true },
    },
  ),
  preset(
    "preset_explorer",
    "Explorer / exobiology",
    "A wider net for ports with the services you need between jumps.",
    {
      radiusLy: 40,
      maxSupercruiseLs: 10000,
      enabledWidgets: { ...DEFAULT_WIDGETS, interstellar_factors: false },
    },
  ),
];

export interface EffectiveProfile extends ProfileConfig {
  id: string;
  name: string;
  blurb: string;
  builtIn: boolean;
  /** Pinned widgets stay on whichever profile is active. */
  pinnedWidgets: readonly WidgetId[];
  /** True when the active built-in preset carries tweaks that were not saved as a profile. */
  modified: boolean;
}

/** A built-in preset plus the player's tweaks on top of it. */
export function effectiveProfile(
  profile: Profile,
  override: Partial<ProfileConfig> | undefined,
  pinnedWidgets: readonly WidgetId[],
): EffectiveProfile {
  return {
    id: profile.id,
    name: profile.name,
    blurb: profile.blurb,
    builtIn: profile.builtIn,
    radiusLy: override?.radiusLy ?? profile.radiusLy,
    maxSupercruiseLs: override?.maxSupercruiseLs ?? profile.maxSupercruiseLs,
    padFilter: override?.padFilter ?? profile.padFilter,
    excludeFleetCarriers: override?.excludeFleetCarriers ?? profile.excludeFleetCarriers,
    enabledWidgets: { ...profile.enabledWidgets, ...override?.enabledWidgets },
    pinnedWidgets,
    modified: Boolean(override && Object.keys(override).length > 0),
  };
}

export function isWidgetEnabled(
  profile: Pick<EffectiveProfile, "enabledWidgets" | "pinnedWidgets">,
  id: WidgetId,
): boolean {
  return profile.enabledWidgets[id] || profile.pinnedWidgets.includes(id);
}

/** Enabled widgets in display order. */
export function enabledWidgetIds(profile: Pick<EffectiveProfile, "enabledWidgets" | "pinnedWidgets">): WidgetId[] {
  return WIDGETS.map((widget) => widget.id).filter((id) => isWidgetEnabled(profile, id));
}

/** The smallest pad a port must have under this filter, or null for "any". */
export function minimumPadSize(
  padFilter: PadFilter,
  shipPadSize: PadSize | null,
): PadSize | null {
  switch (padFilter) {
    case "any":
      return null;
    case "medium":
      return "M";
    case "large":
      return "L";
    default:
      return shipPadSize ?? "L";
  }
}

/** Whether a port with this largest pad passes the filter. */
export function padAccepts(largestPortPad: PadSize, minimum: PadSize | null): boolean {
  if (minimum === null) {
    return true;
  }
  const rank: Record<PadSize, number> = { S: 0, M: 1, L: 2 };
  return rank[largestPortPad] >= rank[minimum];
}

export const PROFILE_EXPORT_SCHEMA = "ed-sitaware/profile/v1";

/** The shape of a profile file shared between players. */
export interface ProfileExport {
  schema: typeof PROFILE_EXPORT_SCHEMA;
  name: string;
  radiusLy: number;
  maxSupercruiseLs: number;
  padFilter: PadFilter;
  excludeFleetCarriers: boolean;
  enabledWidgets: Record<WidgetId, boolean>;
  pinnedWidgets: WidgetId[];
}

export function exportProfile(profile: EffectiveProfile): ProfileExport {
  return {
    schema: PROFILE_EXPORT_SCHEMA,
    name: profile.name,
    radiusLy: profile.radiusLy,
    maxSupercruiseLs: profile.maxSupercruiseLs,
    padFilter: profile.padFilter,
    excludeFleetCarriers: profile.excludeFleetCarriers,
    enabledWidgets: { ...profile.enabledWidgets },
    pinnedWidgets: [...profile.pinnedWidgets],
  };
}

const PAD_FILTER_IDS: readonly PadFilter[] = ["auto", "any", "medium", "large"];
export const MAX_PROFILE_NAME_LENGTH = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validate a parsed profile file. Values are coerced where that is safe (a radius off
 * the step, a missing widget) and rejected where it is not (no name, a broken shape).
 */
export function parseProfileImport(
  input: unknown,
): { ok: true; data: ProfileExport } | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: "That file does not contain a profile." };
  }
  if (typeof input.name !== "string" || input.name.trim() === "") {
    return { ok: false, error: "The profile has no name." };
  }
  const name = input.name.trim().slice(0, MAX_PROFILE_NAME_LENGTH);
  if (
    typeof input.radiusLy !== "number" ||
    !Number.isFinite(input.radiusLy) ||
    typeof input.maxSupercruiseLs !== "number" ||
    !Number.isFinite(input.maxSupercruiseLs) ||
    typeof input.excludeFleetCarriers !== "boolean"
  ) {
    return { ok: false, error: "The profile's filters are malformed." };
  }
  const padFilter = PAD_FILTER_IDS.includes(input.padFilter as PadFilter)
    ? (input.padFilter as PadFilter)
    : "auto";
  const rawWidgets = isRecord(input.enabledWidgets) ? input.enabledWidgets : {};
  const enabledWidgets = { ...DEFAULT_WIDGETS };
  for (const { id } of WIDGETS) {
    if (typeof rawWidgets[id] === "boolean") {
      enabledWidgets[id] = rawWidgets[id];
    }
  }
  const pinnedWidgets = Array.isArray(input.pinnedWidgets)
    ? input.pinnedWidgets.filter((id): id is WidgetId => id in enabledWidgets)
    : [];

  return {
    ok: true,
    data: {
      schema: PROFILE_EXPORT_SCHEMA,
      name,
      radiusLy: clampRadius(input.radiusLy),
      maxSupercruiseLs: nearestSupercruiseStep(input.maxSupercruiseLs),
      padFilter,
      excludeFleetCarriers: input.excludeFleetCarriers,
      enabledWidgets,
      pinnedWidgets,
    },
  };
}

/** Id for a new custom profile. Random where available so two tabs never collide. */
export function newProfileId(): string {
  const cryptoApi: Crypto | undefined =
    typeof globalThis.crypto === "undefined" ? undefined : globalThis.crypto;
  return `custom-${cryptoApi?.randomUUID?.() ?? Date.now().toString(36)}`;
}
