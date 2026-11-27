// @vitest-environment node
import { describe, expect, it } from "vitest";
import { WIDGETS } from "./widgets";
import {
  BUILT_IN_PROFILES,
  RADIUS,
  SUPERCRUISE_STEPS,
  clampRadius,
  effectiveProfile,
  enabledWidgetIds,
  exportProfile,
  isWidgetEnabled,
  minimumPadSize,
  nearestSupercruiseStep,
  padAccepts,
  parseProfileImport,
} from "./profiles";

describe("built-in presets", () => {
  it("are well formed", () => {
    const ids = new Set<string>();
    for (const profile of BUILT_IN_PROFILES) {
      expect(ids.has(profile.id)).toBe(false);
      ids.add(profile.id);
      expect(profile.builtIn).toBe(true);
      expect(profile.radiusLy).toBeGreaterThanOrEqual(RADIUS.min);
      expect(profile.radiusLy).toBeLessThanOrEqual(RADIUS.max);
      expect(profile.radiusLy % RADIUS.step).toBe(0);
      expect(SUPERCRUISE_STEPS).toContain(profile.maxSupercruiseLs);
      expect(Object.keys(profile.enabledWidgets).sort()).toEqual(WIDGETS.map((w) => w.id).sort());
    }
  });

  it("default to 5,000 Ls and a 25 ly radius", () => {
    const general = BUILT_IN_PROFILES.find((profile) => profile.id === "preset_general");
    expect(general).toMatchObject({ radiusLy: 25, maxSupercruiseLs: 5000, padFilter: "auto" });
  });
});

describe("effectiveProfile", () => {
  const general = BUILT_IN_PROFILES[0];

  it("is the preset itself when nothing has been tweaked", () => {
    const profile = effectiveProfile(general, undefined, ["tech_brokers"]);
    expect(profile.modified).toBe(false);
    expect(profile.radiusLy).toBe(general.radiusLy);
    expect(enabledWidgetIds(profile)).toEqual([
      "nearest_ports",
      "material_traders",
      "interstellar_factors",
      "tech_brokers",
      "hazard_alerts",
    ]);
  });

  it("layers tweaks on a preset without changing the preset", () => {
    const profile = effectiveProfile(
      general,
      { radiusLy: 60, enabledWidgets: { ...general.enabledWidgets, mining_reserves: true } },
      [],
    );
    expect(profile.modified).toBe(true);
    expect(profile.radiusLy).toBe(60);
    expect(isWidgetEnabled(profile, "mining_reserves")).toBe(true);
    expect(general.radiusLy).toBe(25);
    expect(general.enabledWidgets.mining_reserves).toBe(false);
  });

  it("keeps a pinned widget on even when the profile switches it off", () => {
    const profile = effectiveProfile(general, undefined, ["combat_zones"]);
    expect(profile.enabledWidgets.combat_zones).toBe(false);
    expect(isWidgetEnabled(profile, "combat_zones")).toBe(true);
  });
});

describe("pad filters", () => {
  it("follow the ship on auto", () => {
    expect(minimumPadSize("auto", "S")).toBe("S");
    expect(minimumPadSize("auto", "L")).toBe("L");
  });

  it("fall back to large when the ship is unknown", () => {
    expect(minimumPadSize("auto", null)).toBe("L");
  });

  it("can be pinned", () => {
    expect(minimumPadSize("any", "S")).toBeNull();
    expect(minimumPadSize("medium", "S")).toBe("M");
    expect(minimumPadSize("large", "S")).toBe("L");
  });

  it("accept a port whose largest pad is big enough", () => {
    expect(padAccepts("L", "L")).toBe(true);
    expect(padAccepts("M", "L")).toBe(false);
    expect(padAccepts("S", null)).toBe(true);
    expect(padAccepts("M", "M")).toBe(true);
  });
});

describe("limits", () => {
  it("keep the radius on its step and inside its range", () => {
    expect(clampRadius(37)).toBe(35);
    expect(clampRadius(38)).toBe(40);
    expect(clampRadius(5)).toBe(10);
    expect(clampRadius(1000)).toBe(100);
  });

  it("snap the supercruise limit to the nearest step", () => {
    expect(nearestSupercruiseStep(8000)).toBe(10000);
    expect(nearestSupercruiseStep(6000)).toBe(5000);
    expect(nearestSupercruiseStep(-5)).toBe(1000);
  });
});

describe("profile files", () => {
  const source = effectiveProfile(
    BUILT_IN_PROFILES[2],
    { radiusLy: 45 },
    ["tech_brokers", "combat_zones"],
  );

  it("survive an export and an import unchanged", () => {
    const exported = exportProfile(source);
    expect(exported.schema).toBe("ed-sitaware/profile/v1");
    const imported = parseProfileImport(JSON.parse(JSON.stringify(exported)));
    expect(imported).toEqual({ ok: true, data: exported });
  });

  it("repair what can safely be repaired", () => {
    const imported = parseProfileImport({
      name: "  Squadron miner  ",
      radiusLy: 37,
      maxSupercruiseLs: 7300,
      padFilter: "pad-size-unknown",
      excludeFleetCarriers: false,
      enabledWidgets: { mining_reserves: true, bogus_widget: true },
    });
    expect(imported).toEqual({
      ok: true,
      data: expect.objectContaining({
        name: "Squadron miner",
        radiusLy: 35,
        maxSupercruiseLs: 5000,
        padFilter: "auto",
        excludeFleetCarriers: false,
        enabledWidgets: expect.objectContaining({ mining_reserves: true }),
        pinnedWidgets: [],
      }),
    });
  });

  it("reject anything that is not a usable profile", () => {
    expect(parseProfileImport(null)).toEqual({ ok: false, error: "That file does not contain a profile." });
    expect(parseProfileImport("nope")).toEqual({ ok: false, error: "That file does not contain a profile." });
    expect(parseProfileImport({ radiusLy: 25 })).toEqual({ ok: false, error: "The profile has no name." });
    expect(parseProfileImport({ name: "   " })).toEqual({ ok: false, error: "The profile has no name." });
    expect(parseProfileImport({ name: "Mined", radiusLy: "far" })).toEqual({
      ok: false,
      error: "The profile's filters are malformed.",
    });
  });
});
