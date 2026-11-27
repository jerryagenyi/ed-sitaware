// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  factionStateSeverity,
  stationHazards,
  systemHazards,
  uniqueHazards,
  type Hazard,
} from "./hazards";
import type { FactionState, StationInfo, SystemInfo } from "./state";

const faction = (name: string, state: string, activeStates: string[] = []): FactionState => ({
  name,
  state,
  activeStates,
  pendingStates: [],
});

const station = (overrides: Partial<StationInfo> = {}): StationInfo => ({
  name: "Thornbury Point",
  type: "Outpost",
  marketId: 1,
  distanceFromStarLs: 312,
  pads: { small: 4, medium: 3, large: 0 },
  services: [],
  economy: null,
  allegiance: null,
  government: null,
  faction: { name: "Voss Free Union", state: "None" },
  ...overrides,
});

const system = (overrides: Partial<SystemInfo> = {}): SystemInfo => ({
  name: "Voss 214",
  address: null,
  position: null,
  allegiance: null,
  economy: null,
  secondEconomy: null,
  government: null,
  security: null,
  population: null,
  arrivalBody: null,
  arrivalBodyType: null,
  controllingFaction: faction("Voss Free Union", "None"),
  powerplay: { powers: [], state: null, controllingPower: null },
  factions: [],
  conflicts: [],
  ...overrides,
});

const LOCKDOWN_DETAIL =
  "Station services are restricted while the faction holds this state.";

describe("stationHazards", () => {
  it("stays quiet without a station", () => {
    expect(stationHazards(null, 5000)).toEqual([]);
  });

  it("warns about an approach longer than the limit", () => {
    expect(stationHazards(station({ distanceFromStarLs: 5001 }), 5000)).toEqual([
      {
        id: "station-long-supercruise",
        group: "station:long-supercruise",
        severity: "warn",
        label: "Long supercruise",
        detail: "5,001 Ls from the arrival star",
      },
    ]);
  });

  it("accepts an approach exactly at the limit", () => {
    expect(stationHazards(station({ distanceFromStarLs: 5000 }), 5000)).toEqual([]);
  });

  it("honours a limit the player has raised", () => {
    expect(stationHazards(station({ distanceFromStarLs: 8420 }), 10000)).toEqual([]);
    expect(stationHazards(station({ distanceFromStarLs: 8420 }), 5000)).toHaveLength(1);
  });

  it("flags a planetary port", () => {
    const hazards = stationHazards(station({ type: "CraterPort" }), 5000);
    expect(hazards).toHaveLength(1);
    expect(hazards[0]).toMatchObject({
      id: "station-surface-port",
      severity: "info",
      label: "Planetary port",
    });
  });

  it("puts a Lockdown ahead of a long approach", () => {
    const hazards = stationHazards(
      station({ distanceFromStarLs: 90000, faction: { name: "Voss Free Union", state: "Lockdown" } }),
      5000,
    );
    expect(hazards.map(({ id, severity }) => [id, severity])).toEqual([
      ["station-faction-Voss Free Union-Lockdown", "danger"],
      ["station-long-supercruise", "warn"],
    ]);
    expect(hazards[0].detail).toBe(`Voss Free Union is in Lockdown. ${LOCKDOWN_DETAIL}`);
  });

  it("reads a state the faction is only entering or leaving as no hazard", () => {
    expect(stationHazards(station({ faction: { name: "X", state: "Boom" } }), 5000)).toEqual([]);
  });
});

describe("systemHazards", () => {
  it("stays quiet without a system", () => {
    expect(systemHazards(null)).toEqual([]);
  });

  it("stays quiet for a peaceful system", () => {
    expect(systemHazards(system())).toEqual([]);
  });

  it("raises the controlling faction's state as a system-wide warning", () => {
    expect(
      systemHazards(system({ controllingFaction: faction("Voss Free Union", "Boom", ["Lockdown"]) })),
    ).toEqual([
      {
        id: "system-faction-Voss Free Union-Lockdown",
        group: "faction:Voss Free Union:Lockdown",
        severity: "danger",
        label: "Lockdown",
        detail: `Voss Free Union is in Lockdown. ${LOCKDOWN_DETAIL}`,
      },
    ]);
  });

  it("counts other factions in trouble without repeating the controlling one", () => {
    const hazards = systemHazards(
      system({
        controllingFaction: faction("A", "None"),
        factions: [
          faction("A", "CivilWar"),
          faction("B", "None", ["CivilWar", "Boom"]),
          faction("C", "None", ["CivilWar", "CivilUnrest"]),
          faction("D", "Famine"),
        ],
      }),
    );
    // Civil war is counted (conflict zones); civil unrest, boom and famine are not.
    expect(hazards).toEqual([
      {
        id: "system-factions-CivilWar",
        group: "factions:CivilWar",
        severity: "info",
        label: "2 factions in civil war",
        detail: "Conflict zones are active.",
      },
    ]);
  });

  it("counts other factions in Lockdown and infrastructure failure", () => {
    const hazards = systemHazards(
      system({
        factions: [faction("B", "None", ["Lockdown"]), faction("C", "InfrastructureFailure")],
      }),
    );
    expect(hazards.map(({ label, detail }) => [label, detail])).toEqual([
      ["1 faction in lockdown", LOCKDOWN_DETAIL],
      [
        "1 faction in infrastructure failure",
        "The faction's infrastructure is failing and services may be reduced.",
      ],
    ]);
  });
});

describe("uniqueHazards", () => {
  it("says a warning once when the station and the system share it", () => {
    const both: Hazard[] = [
      ...stationHazards(station({ faction: { name: "Voss Free Union", state: "Lockdown" } }), 5000),
      ...systemHazards(system({ controllingFaction: faction("Voss Free Union", "Lockdown") })),
    ];
    expect(both).toHaveLength(2);
    const unique = uniqueHazards(both);
    expect(unique.map(({ id, group }) => [id, group])).toEqual([
      ["station-faction-Voss Free Union-Lockdown", "faction:Voss Free Union:Lockdown"],
    ]);
  });

  it("keeps warnings that only look alike", () => {
    const different = uniqueHazards([
      ...systemHazards(system({ controllingFaction: faction("A", "Lockdown") })),
      ...systemHazards(system({ controllingFaction: faction("B", "Lockdown") })),
    ]);
    expect(different.map(({ group }) => group)).toEqual(["faction:A:Lockdown", "faction:B:Lockdown"]);
  });

  it("gives every hazard of a full demo session its own key", () => {
    const all = [
      ...stationHazards(
        station({
          distanceFromStarLs: 8420,
          faction: { name: "Voss Free Union", state: "Lockdown" },
        }),
        5000,
      ),
      ...systemHazards(
        system({
          controllingFaction: faction("Voss Free Union", "Lockdown"),
          factions: [faction("Voss Jet-Tour", "CivilWar")],
        }),
      ),
    ];
    const ids = all.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("factionStateSeverity", () => {
  it("ranks the states a player should know about", () => {
    expect(factionStateSeverity("Lockdown")).toBe("danger");
    expect(factionStateSeverity("InfrastructureFailure")).toBe("warn");
    expect(factionStateSeverity("War")).toBe("info");
    expect(factionStateSeverity("Boom")).toBeNull();
    expect(factionStateSeverity("None")).toBeNull();
  });
});
