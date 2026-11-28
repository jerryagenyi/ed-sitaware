import type { RawJournalEvent } from "@/lib/journal/fields";

/**
 * A made-up session for demo mode, written the way the real journal writes one. Every
 * place, commander and faction here is invented, but the shapes are taken from real
 * journals (game version 4.4), so the demo shows what the dashboard really has to work
 * with. Keep it that way: when something new is learnt about the real journal, change
 * it here too.
 *
 * What it shows, and why:
 * - A login on a fleet carrier in an unpopulated system. That is how many sessions
 *   start, and the journal then leaves out the carrier's distance from the star and
 *   its pad counts. It does give both at the next docking.
 * - A long procedural system name, which has to wrap rather than be cut off.
 * - A change of game mode, reported as its own event.
 * - An undock, a hyperspace jump into a populated system with factions and Powerplay,
 *   an approach and a docking at an outpost with no large pads, a long way from the
 *   star, run by a faction in Lockdown. Then a step outside on foot.
 */
export interface DemoLine {
  /** When the line is "written", in milliseconds after the demo starts. */
  atMs: number;
  event: RawJournalEvent;
}

const T0 = Date.parse("2026-11-27T18:02:11Z");
const stamp = (atMs: number) => new Date(T0 + atMs).toISOString();

const line = (atMs: number, fields: { event: string } & Record<string, unknown>): DemoLine => ({
  atMs,
  event: { timestamp: stamp(atMs), ...fields },
});

/** An invented name with the shape and length of a real procedural system. */
const HOME_SYSTEM = "Col 278 Sector LS-Z b31-2";
const HOME_ADDRESS = 67780355447;
const CARRIER = "SQA-7D4";
const CARRIER_ID = 3700863584;

const DESTINATION = "Eravine";
const DESTINATION_ADDRESS = 871620484127;
const OUTPOST = "Thornbury Point";
const OUTPOST_ID = 271828182845;

/** The services a fleet carrier lists in the journal. */
const CARRIER_SERVICES = [
  "autodock",
  "bartender",
  "blackmarket",
  "carrierfuel",
  "carriermanagement",
  "commodities",
  "contacts",
  "crewlounge",
  "dock",
  "engineer",
  "exploration",
  "flightcontroller",
  "livery",
  "outfitting",
  "pioneersupplies",
  "rearm",
  "refuel",
  "repair",
  "shipyard",
  "socialspace",
  "squadronBank",
  "stationMenu",
  "stationoperations",
  "vistagenomics",
  "voucherredemption",
];

const CARGO = {
  event: "Cargo",
  Vessel: "Ship",
  Count: 6,
  Inventory: [
    { Name: "Coffee", Name_Localised: "Coffee", Count: 4, Stolen: false },
    { Name: "Superconductors", Name_Localised: "Superconductors", Count: 2, Stolen: false },
  ],
};

export const DEMO_LINES: readonly DemoLine[] = [
  // Loading in, already on the carrier.
  line(0, {
    event: "Fileheader",
    part: 1,
    gameversion: "4.4.2.1",
    build: "r334925/r0 ",
    language: "English/UK",
    Odyssey: true,
  }),
  line(0, { event: "Commander", Name: "SitAware Demo" }),
  line(0, {
    event: "LoadGame",
    Commander: "SitAware Demo",
    Horizons: true,
    Odyssey: true,
    Ship: "CobraMkIII",
    Ship_Localised: "Cobra Mk III",
    ShipID: 7,
    ShipName: "Second Screen",
    ShipIdent: "SA-01",
    GameMode: "Open",
    FuelCapacity: { Main: 16, Reserve: 0.6 },
    FuelLevel: 15.2,
    Loan: 0,
    language: "English/UK",
    gameversion: "4.4.2.1",
    build: "r334925/r0 ",
  }),
  line(0, { event: "GameModeChange", GameMode: "Solo" }),
  line(0, {
    event: "CarrierLocation",
    BodyID: 1,
    CarrierID: CARRIER_ID,
    CarrierType: "FleetCarrier",
    StarSystem: HOME_SYSTEM,
    SystemAddress: HOME_ADDRESS,
  }),
  // At a login on a carrier the journal gives the carrier but no distance from the
  // star, no pad counts, and, in an unpopulated system, no factions.
  line(0, {
    event: "Location",
    Docked: true,
    StarSystem: HOME_SYSTEM,
    StarPos: [821.5, -147.25, -640.125],
    SystemAllegiance: "",
    SystemEconomy: "$economy_None;",
    SystemSecondEconomy: "$economy_None;",
    SystemGovernment: "$government_None;",
    SystemSecurity: "$SYSTEM_SECURITY_low;",
    SystemSecurity_Localised: "Low",
    Population: 0,
    Body: CARRIER,
    BodyID: 13,
    BodyType: "Station",
    MarketID: CARRIER_ID,
    StationName: CARRIER,
    StationType: "FleetCarrier",
    StationEconomy: "$economy_Carrier;",
    StationEconomy_Localised: "Carrier",
    StationEconomies: [{ Name: "$economy_Carrier;", Name_Localised: "Carrier", Proportion: 1 }],
    StationGovernment: "$government_Carrier;",
    StationGovernment_Localised: "Carrier",
    StationServices: CARRIER_SERVICES,
    Taxi: false,
    Multicrew: false,
  }),
  line(0, {
    event: "Loadout",
    Ship: "cobramkiii",
    ShipID: 7,
    ShipName: "Second Screen",
    ShipIdent: "SA-01",
    HullValue: 1381932,
    ModulesValue: 7682602,
    HullHealth: 1,
    UnladenMass: 154.2,
    CargoCapacity: 28,
    MaxJumpRange: 31.62,
    FuelCapacity: { Main: 16, Reserve: 0.6 },
    Rebuy: 453227,
  }),
  line(0, CARGO),

  // Leaving the carrier and jumping to a populated system.
  line(4000, { event: "Undocked", StationName: CARRIER, StationType: "FleetCarrier", MarketID: CARRIER_ID }),
  line(8000, { event: "SupercruiseEntry", StarSystem: HOME_SYSTEM, SystemAddress: HOME_ADDRESS }),
  line(13000, {
    event: "StartJump",
    JumpType: "Hyperspace",
    StarSystem: DESTINATION,
    SystemAddress: DESTINATION_ADDRESS,
    StarClass: "M",
    Taxi: false,
  }),
  line(19000, {
    event: "FSDJump",
    StarSystem: DESTINATION,
    SystemAddress: DESTINATION_ADDRESS,
    StarPos: [12.5, -31.25, 48.125],
    SystemAllegiance: "Independent",
    SystemEconomy: "$economy_Refinery;",
    SystemEconomy_Localised: "Refinery",
    SystemSecondEconomy: "$economy_Extraction;",
    SystemSecondEconomy_Localised: "Extraction",
    SystemGovernment: "$government_Anarchy;",
    SystemGovernment_Localised: "Anarchy",
    SystemSecurity: "$GAlAXY_MAP_INFO_state_anarchy;",
    SystemSecurity_Localised: "Anarchy",
    Population: 1876543210,
    Body: DESTINATION,
    BodyID: 0,
    BodyType: "Star",
    JumpDist: 9.864,
    FuelUsed: 0.084,
    FuelLevel: 15.5,
    BoostUsed: 1,
    Factions: [
      {
        Name: "Voss Free Union",
        FactionState: "Lockdown",
        ActiveStates: [{ State: "Lockdown", Trend: 0 }],
        Government: "$government_Anarchy;",
        Influence: 0.48,
      },
      {
        Name: "Voss Jet-Tour",
        FactionState: "CivilWar",
        ActiveStates: [{ State: "CivilWar", Trend: 0 }],
        Government: "$government_Dictatorship;",
        Influence: 0.31,
      },
      {
        Name: "Eravine Coalition",
        FactionState: "Boom",
        ActiveStates: [{ State: "Boom", Trend: 0 }],
        Government: "$government_Democracy;",
        Influence: 0.21,
      },
    ],
    SystemFaction: { Name: "Voss Free Union", FactionState: "Lockdown" },
    Conflicts: [{ WarType: "civilwar", Status: "active", Faction1: "Voss Jet-Tour", Faction2: "Eravine Coalition" }],
    Powers: "Zemina Torval",
    PowerplayState: "Exploited",
    ControllingPower: "Zemina Torval",
    PowerplayConflictProgress: [],
    PowerplayStateControlProgress: 0.37,
    PowerplayStateReinforcement: 0,
    PowerplayStateUndermining: 0,
    Taxi: false,
    Multicrew: false,
  }),
  line(24000, {
    event: "SupercruiseExit",
    StarSystem: DESTINATION,
    SystemAddress: DESTINATION_ADDRESS,
    Body: OUTPOST,
    BodyID: 4,
    BodyType: "Station",
    Taxi: false,
    Multicrew: false,
  }),

  // Docking: now the journal gives the distance from the star and the pads.
  line(29000, {
    event: "Docked",
    StarSystem: DESTINATION,
    SystemAddress: DESTINATION_ADDRESS,
    MarketID: OUTPOST_ID,
    StationName: OUTPOST,
    StationType: "Outpost",
    DistFromStarLS: 8420,
    StationServices: ["Dock", "Refuel", "Repair", "Rearm", "Commodities", "Facilitator", "MaterialTrader"],
    StationAllegiance: "Independent",
    StationEconomy: "$economy_Extraction;",
    StationEconomy_Localised: "Extraction",
    StationEconomies: [{ Name: "$economy_Extraction;", Name_Localised: "Extraction", Proportion: 1 }],
    StationGovernment: "$government_Anarchy;",
    StationGovernment_Localised: "Anarchy",
    StationFaction: { Name: "Voss Free Union", FactionState: "Lockdown" },
    LandingPads: { Small: 4, Medium: 3, Large: 0 },
    ActiveFine: false,
    Taxi: false,
    Multicrew: false,
  }),
  line(30000, CARGO),

  // A step outside on foot.
  line(33000, {
    event: "Disembark",
    ID: 7,
    StarSystem: DESTINATION,
    SystemAddress: DESTINATION_ADDRESS,
    StationName: OUTPOST,
    StationType: "Outpost",
    MarketID: OUTPOST_ID,
    OnStation: true,
    OnPlanet: false,
    SRV: false,
    Taxi: false,
  }),
];
