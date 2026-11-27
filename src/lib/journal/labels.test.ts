// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  humaniseId,
  isFleetCarrier,
  isSurfaceStation,
  labelFromKey,
  notableServices,
  serviceLabel,
  stationTypeLabel,
} from "./labels";

describe("labelFromKey", () => {
  it("turns localisation keys into labels", () => {
    expect(labelFromKey("$SYSTEM_SECURITY_high;")).toBe("High");
    expect(labelFromKey("$GAlAXY_MAP_INFO_state_anarchy;")).toBe("Anarchy");
    expect(labelFromKey("$government_Corporate;")).toBe("Corporate");
    expect(labelFromKey("$economy_Extraction;")).toBe("Extraction");
  });

  it("prefers the game's own localised text", () => {
    expect(labelFromKey("$economy_Extraction;", "Extraction")).toBe("Extraction");
    expect(labelFromKey("$economy_Extraction;", "Förädling")).toBe("Förädling");
  });

  it("treats 'None' and junk as no value", () => {
    expect(labelFromKey("$economy_None;")).toBeNull();
    expect(labelFromKey("None")).toBeNull();
    expect(labelFromKey("")).toBeNull();
    expect(labelFromKey(42)).toBeNull();
    expect(labelFromKey(undefined, undefined)).toBeNull();
  });
});

describe("services and station types", () => {
  it("labels services however the journal cases them", () => {
    expect(serviceLabel("techBroker")).toBe("Tech broker");
    expect(serviceLabel("materialtrader")).toBe("Material trader");
    expect(serviceLabel("facilitator")).toBe("Interstellar factors");
    expect(serviceLabel("warpCoilShop")).toBe("Warp coil shop");
  });

  it("lists only the services worth a glance, in a fixed order", () => {
    expect(notableServices(["dock", "techBroker", "refuel", "MaterialTrader", "contacts"])).toEqual([
      "Refuel",
      "Material trader",
      "Tech broker",
    ]);
    expect(notableServices(["dock", "contacts"])).toEqual([]);
  });

  it("recognises planetary ports and fleet carriers", () => {
    for (const type of ["CraterPort", "CraterOutpost", "SurfaceStation"]) {
      expect(isSurfaceStation(type)).toBe(true);
    }
    expect(isSurfaceStation("Outpost")).toBe(false);
    expect(isSurfaceStation(null)).toBe(false);
    expect(isFleetCarrier("FleetCarrier")).toBe(true);
    expect(isFleetCarrier("Coriolis")).toBe(false);
  });

  it("labels station types", () => {
    expect(stationTypeLabel("AsteroidBase")).toBe("Asteroid base");
    expect(stationTypeLabel("Orbis")).toBe("Orbis");
    expect(stationTypeLabel("megaship")).toBe("Megaship");
    expect(stationTypeLabel("SomeNewType")).toBe("Some new type");
    expect(stationTypeLabel(null)).toBeNull();
  });

  it("splits camel-case ids into a sentence", () => {
    expect(humaniseId("CombatPerformanceStabilisers")).toBe("Combat performance stabilisers");
    expect(humaniseId("biowaste")).toBe("Biowaste");
  });
});
