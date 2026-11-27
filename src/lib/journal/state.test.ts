// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { RawJournalEvent } from "./fields";
import { INITIAL_COMMANDER_STATE, applyJournalEvent, describeActivity } from "./state";

const NOW = Date.parse("2026-11-27T18:30:00Z");

const ev = (event: string, fields: Record<string, unknown> = {}): RawJournalEvent => ({
  timestamp: "2026-11-27T18:30:00Z",
  event,
  ...fields,
});

const fold = (events: RawJournalEvent[]) =>
  events.reduce(
    (state, event) => applyJournalEvent(state, event, NOW),
    structuredClone(INITIAL_COMMANDER_STATE),
  );

const LOCATION_DOCKED = ev("Location", {
  StarSystem: "Eravine",
  SystemAddress: 501,
  StarPos: [12.5, -31.25, 48.125],
  SystemAllegiance: "Federation",
  SystemEconomy: "$economy_Extraction;",
  SystemEconomy_Localised: "Extraction",
  SystemGovernment: "$government_Democracy;",
  SystemSecurity: "$SYSTEM_SECURITY_medium;",
  Population: 2345678901,
  Body: "Kestrel Reach",
  BodyType: "Station",
  Docked: true,
  StationName: "Kestrel Reach",
  StationType: "Orbis",
  MarketID: 31415,
  DistFromStarLS: 312,
  StationServices: ["Dock", "Refuel", "materialtrader", "techBroker"],
  StationFaction: { Name: "Eravine Coalition", FactionState: "Boom" },
  SystemFaction: { Name: "Eravine Coalition", FactionState: "Boom" },
  Powers: "Zemina Torval",
  PowerplayState: "Fortified",
  ControllingPower: "Zemina Torval",
});

describe("applyJournalEvent", () => {
  it("reports the commander, client and ship after login", () => {
    const state = fold([
      ev("Fileheader", { gameversion: "4.4.2.1", build: "r334925/r0 " }),
      ev("LoadGame", { Commander: "HRC1", FID: "F44396", GameMode: "Open", Odyssey: true }),
      ev("Loadout", {
        Ship: "cobramkiii",
        ShipID: 7,
        ShipName: "Tea Fuelled",
        ShipIdent: "SA-01",
        CargoCapacity: 28,
        MaxJumpRange: 31.62,
        FuelCapacity: { Main: 16, Reserve: 0.6 },
        Rebuy: 123456,
      }),
    ]);
    expect(state.commanderName).toBe("HRC1");
    expect(state.gameMode).toBe("Open");
    expect(state.client).toEqual({ gameVersion: "4.4.2.1", gameBuild: "r334925/r0 ", odyssey: true });
    expect(state.ship).toMatchObject({
      symbolicName: "cobramkiii",
      className: "Cobra Mk III",
      padSize: "S",
      known: true,
      name: "Tea Fuelled",
      ident: "SA-01",
      maxJumpRange: 31.62,
      cargoCapacity: 28,
      fuelCapacity: 16,
      rebuy: 123456,
    });
  });

  it("reads a docked start from the Location event", () => {
    const state = fold([LOCATION_DOCKED]);
    expect(state.system).toMatchObject({
      name: "Eravine",
      address: 501,
      position: [12.5, -31.25, 48.125],
      allegiance: "Federation",
      economy: "Extraction",
      government: "Democracy",
      security: "Medium",
      population: 2345678901,
      arrivalBody: "Kestrel Reach",
      controllingFaction: { name: "Eravine Coalition", state: "Boom" },
      // The journal writes a one-entry list as a bare value.
      powerplay: { powers: ["Zemina Torval"], state: "Fortified", controllingPower: "Zemina Torval" },
    });
    expect(state.station).toMatchObject({
      name: "Kestrel Reach",
      type: "Orbis",
      marketId: 31415,
      distanceFromStarLs: 312,
      services: ["Dock", "Refuel", "materialtrader", "techBroker"],
      faction: { name: "Eravine Coalition", state: "Boom" },
    });
    expect(state.motion.docked).toBe(true);
    expect(describeActivity(state, NOW)).toEqual({ label: "Docked", detail: "at Kestrel Reach" });
  });

  it("follows an undock, a jump and a docking at another station", () => {
    const state = fold([
      LOCATION_DOCKED,
      ev("Undocked", { StationName: "Kestrel Reach", StationType: "Orbis", MarketID: 31415 }),
      ev("StartJump", { JumpType: "Hyperspace", StarSystem: "Voss 214", StarClass: "M" }),
      ev("FSDJump", {
        StarSystem: "Voss 214",
        SystemAddress: 502,
        StarPos: [8.9, -30.4, 51.0],
        SystemAllegiance: "Independent",
        SystemEconomy: "$economy_Refinery;",
        SystemSecurity: "$GAlAXY_MAP_INFO_state_anarchy;",
        Population: 1876543210,
        Body: "Voss 214 A",
        BodyType: "Star",
        Factions: [
          { Name: "Voss Free Union", FactionState: "Lockdown" },
          { Name: "Voss Jet-Tour", FactionState: "None", ActiveStates: [{ State: "Boom" }] },
        ],
        SystemFaction: { Name: "Voss Free Union", FactionState: "Lockdown" },
        Powers: [],
        PowerplayState: "Unoccupied",
      }),
      ev("Docked", {
        StarSystem: "Voss 214",
        StationName: "Thornbury Point",
        StationType: "Outpost",
        MarketID: 27182,
        DistFromStarLS: 8420,
        LandingPads: { Small: 4, Medium: 3, Large: 0 },
        StationServices: ["dock", "refuel", "facilitator"],
        StationEconomy: "$economy_Extraction;",
        StationFaction: { Name: "Voss Free Union", FactionState: "Lockdown" },
      }),
    ]);
    expect(state.system).toMatchObject({
      name: "Voss 214",
      security: "Anarchy",
      economy: "Refinery",
      controllingFaction: { name: "Voss Free Union", state: "Lockdown" },
      powerplay: { powers: [], state: "Unoccupied", controllingPower: null },
    });
    expect(state.system?.factions.map((f) => f.name)).toEqual(["Voss Free Union", "Voss Jet-Tour"]);
    expect(state.system?.factions[1].activeStates).toEqual(["Boom"]);
    expect(state.station).toMatchObject({
      name: "Thornbury Point",
      type: "Outpost",
      distanceFromStarLs: 8420,
      pads: { small: 4, medium: 3, large: 0 },
    });
    expect(state.lastStation).toEqual({ name: "Kestrel Reach", system: "Eravine" });
    expect(state.motion.docked).toBe(true);
    expect(state.lastEvent).toEqual({ name: "Docked", timestamp: "2026-11-27T18:30:00Z" });
  });

  it("keeps the station when the commander logs in on foot inside it", () => {
    const state = fold([
      ev("Location", {
        StarSystem: "Shinrarta Dezhra",
        Docked: false,
        OnFoot: true,
        StationName: "Jameson Memorial",
        StationType: "Orbis",
        Body: "Jameson Memorial",
        BodyType: "Station",
      }),
    ]);
    expect(state.station?.name).toBe("Jameson Memorial");
    expect(state.motion).toMatchObject({ docked: true, onFoot: true });
    expect(describeActivity(state, NOW)).toEqual({ label: "On foot", detail: "at Jameson Memorial" });
  });

  it("clears the station when a jump is made", () => {
    const state = fold([LOCATION_DOCKED, ev("FSDJump", { StarSystem: "Sol", StarPos: [0, 0, 0] })]);
    expect(state.station).toBeNull();
    expect(state.motion.docked).toBe(false);
    expect(state.lastStation).toBeNull();
    expect(describeActivity(state, NOW)).toEqual({ label: "Supercruise", detail: "in Sol" });
  });

  it("reads cargo carried, but not cargo stored with a ship in the shipyard", () => {
    const carried = fold([
      ev("Loadout", { Ship: "python", CargoCapacity: 64 }),
      ev("Cargo", {
        Vessel: "Ship",
        Count: 6,
        Inventory: [{ Name: "coffee", Name_Localised: "Coffee", Count: 4 }, { Name: "Superconductors", Count: 2 }],
      }),
    ]);
    expect(carried.cargo).toEqual({
      carried: 6,
      capacity: 64,
      items: [
        { name: "Coffee", count: 4, stolen: false },
        { name: "Superconductors", count: 2, stolen: false },
      ],
    });
    const stored = fold([ev("Cargo", { Vessel: "Shipyard", Count: 500, Inventory: [] })]);
    expect(stored.cargo).toBeNull();
  });
});

describe("describeActivity", () => {
  it("announces a hyperspace jump as it starts", () => {
    const state = fold([ev("StartJump", { JumpType: "Hyperspace", StarSystem: "Sol" })]);
    expect(describeActivity(state, NOW)).toEqual({ label: "Hyperspace", detail: "jumping to Sol" });
  });

  it("stops announcing a jump that was abandoned", () => {
    const state = fold([ev("StartJump", { JumpType: "Hyperspace", StarSystem: "Sol" })]);
    expect(describeActivity(state, NOW + 91_000).label).toBe("In flight");
  });

  it("names the body being approached, until the next trip to supercruise", () => {
    const state = fold([
      ev("Location", { StarSystem: "Sol", Docked: false }),
      ev("SupercruiseEntry", { StarSystem: "Sol" }),
      ev("SupercruiseExit", { Body: "Jameson Memorial", BodyType: "Station" }),
    ]);
    expect(state.motion.supercruise).toBe(false);
    expect(describeActivity(state, NOW)).toEqual({
      label: "In flight",
      detail: "approaching Jameson Memorial",
    });
    const away = fold([
      ev("Location", { StarSystem: "Sol", Docked: false }),
      ev("SupercruiseExit", { Body: "Jameson Memorial", BodyType: "Station" }),
      ev("SupercruiseEntry", { StarSystem: "Sol" }),
    ]);
    expect(away.motion.approaching).toBeNull();
    expect(describeActivity(away, NOW)).toEqual({ label: "Supercruise", detail: "in Sol" });
  });

  it("follows the commander out of the ship and back", () => {
    const onFoot = fold([
      ev("Location", { StarSystem: "Sol", Body: "Earth", BodyType: "Planet" }),
      ev("Disembark", { OnPlanet: true, SRV: false }),
    ]);
    expect(describeActivity(onFoot, NOW)).toEqual({ label: "On foot", detail: "on Earth" });
    const inSrv = fold([
      ev("Disembark", { OnPlanet: true, SRV: true }),
      ev("Touchdown", {}),
    ]);
    expect(inSrv.motion).toMatchObject({ onFoot: false, inSrv: true, landed: true });
    expect(describeActivity(inSrv, NOW).label).toBe("In SRV");
    const backAboard = fold([ev("Disembark", { SRV: true }), ev("Embark", { SRV: false })]);
    expect(backAboard.motion).toMatchObject({ onFoot: false, inSrv: false });
  });

  it("says when the ship was destroyed", () => {
    const destroyed = fold([ev("Location", { StarSystem: "Sol" }), ev("Died", { KillerName: "x" })]);
    expect(describeActivity(destroyed, NOW)).toEqual({ label: "Ship destroyed", detail: "waiting on the rebuy screen" });
    const rebought = fold([ev("Died", {}), ev("Resurrect", { Option: "rebuy" }), ev("Location", { StarSystem: "Sol" })]);
    expect(rebought.motion.destroyed).toBe(false);
  });
});

describe("privacy", () => {
  it("never keeps fields that identify or describe the player", () => {
    const state = fold([
      ev("LoadGame", { Commander: "HRC1", FID: "F44396", Credits: 600120, Loan: 0 }),
      ev("Docked", { StationName: "Jameson Memorial", ActiveFine: true, Wanted: true }),
    ]);
    const serialised = JSON.stringify(state);
    expect(serialised).not.toContain("F44396");
    expect(serialised).not.toContain("600120");
    expect(serialised).not.toContain("ActiveFine");
    expect(serialised).not.toContain("Wanted");
  });

  it("survives an event it was not expecting", () => {
    const state = applyJournalEvent(INITIAL_COMMANDER_STATE, ev("SomeFutureEvent", { Foo: 1 }), NOW);
    expect(state.lastEvent?.name).toBe("SomeFutureEvent");
    expect(state.system).toBeNull();
  });
});
