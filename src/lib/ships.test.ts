// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SHIP_COUNT, normaliseShipName, resolveShip } from "./ships";

describe("resolveShip", () => {
  // Exact `Loadout.Ship` values observed in real journal files.
  it.each([
    ["asp", "M", "Asp Explorer"],
    ["cobramkiii", "S", "Cobra Mk III"],
    ["cobramkv", "S", "Cobra Mk V"],
    ["corsair", "M", "Corsair"],
    ["explorer_nx", "L", "Caspian Explorer"],
    ["federation_corvette", "L", "Federal Corvette"],
    ["independant_trader", "M", "Keelback"],
    ["lakonminer", "M", "Type-11 Prospector"],
    ["mandalay", "M", "Mandalay"],
    ["mediumtransport01", "M", "Lynx Highliner"],
    ["panthermkii", "L", "Panther Clipper Mk II"],
    ["python_nx", "M", "Python Mk II"],
    ["sidewinder", "S", "Sidewinder"],
    ["smallcombat01_nx", "S", "Kestrel Mk II"],
    ["type6", "M", "Type-6 Transporter"],
    ["type8", "M", "Type-8 Transporter"],
    ["typex_3", "M", "Alliance Challenger"],
  ] as const)("maps %s to a %s pad", (raw, padSize, className) => {
    const ship = resolveShip(raw);
    expect(ship?.padSize).toBe(padSize);
    expect(ship?.className).toBe(className);
    expect(ship?.known).toBe(true);
  });

  it("matches however the name is cased or separated", () => {
    expect(resolveShip("Krait_MkII")?.id).toBe(resolveShip("krait_mkii")?.id);
    expect(resolveShip("Cobra Mk. III")?.padSize).toBe("S");
    expect(resolveShip("CobraMkIII")?.padSize).toBe("S");
    expect(resolveShip("FEDERATION_CORVETTE")?.padSize).toBe("L");
  });

  it("tells the two Cutters apart", () => {
    expect(resolveShip("cutter")?.className).toBe("Imperial Cutter");
    expect(resolveShip("federation_corvette")?.className).toBe("Federal Corvette");
    expect(resolveShip("empire_trader")?.className).toBe("Imperial Clipper");
  });

  it("treats a ship it does not know as Large, and says so", () => {
    const ship = resolveShip("SomeBrandNewShip");
    expect(ship).toMatchObject({ known: false, padSize: "L", id: null });
    expect(ship?.className).toBe("Some Brand New Ship");
  });

  it("does not mistake a suit or an SRV for a known ship", () => {
    for (const vehicle of ["TacticalSuit_Class5", "TestBuggy", "Combat_Multicrew_SRV_01"]) {
      expect(resolveShip(vehicle)?.known).toBe(false);
    }
  });

  it("returns nothing without a name", () => {
    expect(resolveShip(null)).toBeNull();
    expect(resolveShip(undefined)).toBeNull();
    expect(resolveShip("")).toBeNull();
  });
});

describe("the pad table", () => {
  it("covers all 49 flyable ships without two names colliding", () => {
    expect(SHIP_COUNT).toBe(49);
    const ids = new Set(
      [
        "adder", "anaconda", "anacondamkii", "asp", "asp_scout", "belugaliner", "cobramkiii", "cobramkiv",
        "cobramkv", "corsair", "cutter", "diamondback", "diamondbackxl", "dolphin", "eagle", "empire_courier",
        "empire_eagle", "empire_trader", "explorer_nx", "federation_corvette", "federation_dropship",
        "federation_dropship_mkii", "federation_gunship", "ferdelance", "hauler", "independant_trader",
        "krait_light", "krait_mkii", "lakonminer", "mandalay", "mamba", "mediumtransport01", "orca",
        "panthermkii", "python", "python_nx", "sidewinder", "smallcombat01_nx", "type6", "type7", "type8",
        "type9", "type9_military", "typex", "typex_2", "typex_3", "viper", "viper_mkiv", "vulture",
      ].map(normaliseShipName),
    );
    expect(ids.size).toBe(SHIP_COUNT);
    for (const id of ids) {
      expect(resolveShip(id)?.known).toBe(true);
    }
  });
});
