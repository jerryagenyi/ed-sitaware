import { beforeEach, describe, expect, it } from "vitest";
import {
  BUILT_IN_PROFILES,
  effectiveProfile,
  exportProfile,
  parseProfileImport,
  type EffectiveProfile,
} from "@/lib/profiles";
import type { WidgetId } from "@/lib/widgets";
import { SETTINGS_STORAGE_KEY } from "@/lib/storage-keys";
import { DEFAULT_SETTINGS, sanitizeSettings, useSettingsStore } from "./settings";

const store = () => useSettingsStore.getState();

/** The same merge `useEffectiveProfile` performs, without the hook. */
const effective = (): EffectiveProfile => {
  const { profiles, activeProfileId, overrides, pinnedWidgets } = store();
  const active = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  return effectiveProfile(active, overrides[active.id], pinnedWidgets);
};

const widgets = (enabled: Partial<Record<WidgetId, boolean>>) => enabled as Record<WidgetId, boolean>;

beforeEach(() => {
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
});

describe("profiles", () => {
  it("starts on the general preset with nothing tweaked", () => {
    expect(store().activeProfileId).toBe("preset_general");
    expect(store().overrides).toEqual({});
    expect(store().pinnedWidgets).toEqual([]);
  });

  it("switches presets, and ignores one that does not exist", () => {
    store().selectProfile("preset_miner");
    expect(store().activeProfileId).toBe("preset_miner");
    store().selectProfile("does-not-exist");
    expect(store().activeProfileId).toBe("preset_miner");
  });

  it("keeps a tweak to a built-in preset off the preset itself", () => {
    store().updateConfig({ radiusLy: 60, enabledWidgets: widgets({ mining_reserves: true }) });
    expect(store().overrides.preset_general).toMatchObject({
      radiusLy: 60,
      enabledWidgets: { mining_reserves: true },
    });
    expect(BUILT_IN_PROFILES[0].radiusLy).toBe(25);
    expect(store().profiles[0].radiusLy).toBe(25);
    expect(effective().radiusLy).toBe(60);
    expect(effective().modified).toBe(true);
  });

  it("leaves the other widgets alone when one is toggled", () => {
    store().updateConfig({ enabledWidgets: widgets({ combat_zones: true }) });
    expect(effective().enabledWidgets.nearest_ports).toBe(true);
    expect(effective().enabledWidgets.tech_brokers).toBe(false);
  });

  it("edits a custom profile in place", () => {
    const id = store().saveAsCustomProfile("Mine");
    store().updateConfig({ radiusLy: 80 });
    expect(store().profiles.find((profile) => profile.id === id)?.radiusLy).toBe(80);
    expect(store().overrides[id]).toBeUndefined();
    expect(effective().modified).toBe(false);
  });

  it("resets a tweaked preset to stock", () => {
    store().updateConfig({ radiusLy: 60 });
    store().resetProfile();
    expect(store().overrides).toEqual({});
    expect(effective().radiusLy).toBe(25);
  });

  it("turns widgets on and off, and unpins one that is switched off", () => {
    store().toggleWidget("combat_zones");
    expect(effective().enabledWidgets.combat_zones).toBe(true);
    store().togglePin("combat_zones");
    store().toggleWidget("combat_zones");
    expect(store().pinnedWidgets).toEqual([]);
    expect(effective().enabledWidgets.combat_zones).toBe(false);
  });

  it("carries a pin across presets, even where the preset switches that widget off", () => {
    store().togglePin("interstellar_factors");
    store().selectProfile("preset_trader");
    expect(effective().enabledWidgets.interstellar_factors).toBe(false);
    expect(effective().pinnedWidgets).toEqual(["interstellar_factors"]);
    store().togglePin("interstellar_factors");
    expect(effective().pinnedWidgets).toEqual([]);
  });
});

describe("custom profiles", () => {
  it("saves the active profile with its tweaks and returns the preset to stock", () => {
    store().selectProfile("preset_miner");
    store().updateConfig({ radiusLy: 45 });
    const id = store().saveAsCustomProfile("  Squadron miner  ");
    expect(store().activeProfileId).toBe(id);
    expect(store().profiles.find((profile) => profile.id === id)).toMatchObject({
      name: "Squadron miner",
      builtIn: false,
      radiusLy: 45,
      maxSupercruiseLs: 10000,
      enabledWidgets: expect.objectContaining({ mining_reserves: true }),
    });
    expect(store().overrides).toEqual({});
  });

  it("names an unnamed profile sensibly", () => {
    const id = store().saveAsCustomProfile("   ");
    expect(store().profiles.find((profile) => profile.id === id)?.name).toBe("Custom profile");
  });

  it("never deletes a built-in preset", () => {
    store().deleteProfile("preset_general");
    expect(store().profiles.some((profile) => profile.id === "preset_general")).toBe(true);
  });

  it("deletes a custom profile and falls back to the general preset", () => {
    const id = store().saveAsCustomProfile("Temp");
    expect(store().activeProfileId).toBe(id);
    store().deleteProfile(id);
    expect(store().profiles.some((profile) => profile.id === id)).toBe(false);
    expect(store().activeProfileId).toBe("preset_general");
  });

  it("adds a shared profile and only ever adds pins", () => {
    store().togglePin("material_traders");
    const parsed = parseProfileImport(
      exportProfile({ ...effective(), name: "Shared", pinnedWidgets: ["tech_brokers"] }),
    );
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    const id = store().importProfile(parsed.data);
    expect(store().activeProfileId).toBe(id);
    expect([...store().pinnedWidgets].sort()).toEqual(["material_traders", "tech_brokers"]);
  });
});

describe("sanitizeSettings", () => {
  it("returns the defaults for anything unusable", () => {
    for (const junk of [null, undefined, "nope", 42, [], {}]) {
      expect(sanitizeSettings(junk)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it("keeps what is valid and repairs what is not", () => {
    const custom = {
      id: "custom-abc",
      name: "Mine",
      builtIn: false,
      blurb: "",
      radiusLy: 40,
      maxSupercruiseLs: 5000,
      padFilter: "any",
      excludeFleetCarriers: false,
      enabledWidgets: { nearest_ports: true },
    };
    const repaired = sanitizeSettings({
      theme: "cyan",
      activeProfileId: "custom-abc",
      profiles: [custom, { id: "broken" }, { ...BUILT_IN_PROFILES[0], radiusLy: 999 }],
      overrides: { preset_general: { radiusLy: 60 }, preset_miner: { radiusLy: "far" } },
      pinnedWidgets: ["tech_brokers", "not_a_widget", 7],
    });
    expect(repaired.theme).toBe("cyan");
    expect(repaired.activeProfileId).toBe("custom-abc");
    // Built-ins come from the current code; the custom profile is kept.
    expect(repaired.profiles).toHaveLength(BUILT_IN_PROFILES.length + 1);
    expect(repaired.profiles[0].radiusLy).toBe(25);
    expect(repaired.profiles.at(-1)?.enabledWidgets.nearest_ports).toBe(true);
    expect(repaired.overrides).toEqual({ preset_general: { radiusLy: 60 } });
    expect(repaired.pinnedWidgets).toEqual(["tech_brokers"]);
  });

  it("falls back when the active profile or the theme has gone", () => {
    expect(sanitizeSettings({ activeProfileId: "custom-gone" }).activeProfileId).toBe("preset_general");
    expect(sanitizeSettings({ theme: "neon" }).theme).toBe("amber");
  });

  it("only ever persists the settings, never the actions", () => {
    const partialize = useSettingsStore.persist.getOptions().partialize;
    const persisted = partialize?.(store());
    expect(Object.keys(persisted ?? {}).sort()).toEqual([
      "activeProfileId",
      "overrides",
      "pinnedWidgets",
      "profiles",
      "theme",
    ]);
  });

  it("uses the stable key the theme script reads", () => {
    expect(SETTINGS_STORAGE_KEY).toBe("ed-sitaware:settings");
  });
});
