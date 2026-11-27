import { resolveShip, type PadSize } from "@/lib/ships";
import {
  asBoolean,
  asNumber,
  asRecordList,
  asString,
  asStringList,
  type RawJournalEvent,
} from "./fields";
import { humaniseId, labelFromKey } from "./labels";

export interface FactionState {
  name: string;
  state: string;
  activeStates: string[];
  pendingStates: string[];
}

export interface PowerplayInfo {
  powers: string[];
  state: string | null;
  controllingPower: string | null;
}

export interface SystemInfo {
  name: string;
  address: number | null;
  /** Galaxy coordinates in light-years. */
  position: [number, number, number] | null;
  allegiance: string | null;
  economy: string | null;
  secondEconomy: string | null;
  government: string | null;
  security: string | null;
  population: number | null;
  /** The star, planet or station the commander arrived at. */
  arrivalBody: string | null;
  arrivalBodyType: string | null;
  controllingFaction: FactionState | null;
  powerplay: PowerplayInfo;
  factions: FactionState[];
  conflicts: { type: string; status: string }[];
}

export interface StationInfo {
  name: string;
  /** Symbolic type as the journal writes it, e.g. `Orbis`, `Outpost`, `FleetCarrier`. */
  type: string | null;
  marketId: number | null;
  distanceFromStarLs: number | null;
  /** Pads per size, or null when the journal did not say. */
  pads: { small: number; medium: number; large: number } | null;
  services: string[];
  economy: string | null;
  allegiance: string | null;
  government: string | null;
  faction: { name: string; state: string } | null;
}

export interface ShipInfo {
  /** Symbolic name exactly as `Loadout.Ship` wrote it. */
  symbolicName: string;
  className: string;
  /** False for a ship that is not in the pad table yet. */
  known: boolean;
  padSize: PadSize;
  /** The name the player gave the ship, if any. */
  name: string | null;
  ident: string | null;
  /** `MaxJumpRange` — unladen, with just enough fuel for one jump. */
  maxJumpRange: number | null;
  cargoCapacity: number | null;
  fuelCapacity: number | null;
  rebuy: number | null;
}

export interface CargoInfo {
  carried: number | null;
  capacity: number | null;
  items: { name: string; count: number; stolen: boolean }[];
}

export interface MotionState {
  docked: boolean;
  supercruise: boolean;
  onFoot: boolean;
  inSrv: boolean;
  landed: boolean;
  destroyed: boolean;
  /** Destination of a hyperspace jump that has started but not completed. */
  jumpingTo: string | null;
  /** When that jump started, in wall-clock milliseconds. */
  jumpingSince: number | null;
  /** Body the commander dropped out of supercruise next to. */
  approaching: { body: string; bodyType: string } | null;
}

export interface CommanderState {
  commanderName: string | null;
  gameMode: string | null;
  client: { gameVersion: string | null; gameBuild: string | null; odyssey: boolean | null };
  system: SystemInfo | null;
  /** Set while docked, or on foot inside a station. */
  station: StationInfo | null;
  lastStation: { name: string; system: string } | null;
  ship: ShipInfo | null;
  cargo: CargoInfo | null;
  motion: MotionState;
  lastEvent: { name: string; timestamp: string | null } | null;
}

export const INITIAL_MOTION: MotionState = {
  docked: false,
  supercruise: false,
  onFoot: false,
  inSrv: false,
  landed: false,
  destroyed: false,
  jumpingTo: null,
  jumpingSince: null,
  approaching: null,
};

export const INITIAL_COMMANDER_STATE: CommanderState = {
  commanderName: null,
  gameMode: null,
  client: { gameVersion: null, gameBuild: null, odyssey: null },
  system: null,
  station: null,
  lastStation: null,
  ship: null,
  cargo: null,
  motion: INITIAL_MOTION,
  lastEvent: null,
};

function nonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function namedFaction(record: unknown): { name: string; state: string } | null {
  if (typeof record !== "object" || record === null) {
    return null;
  }
  const r = record as Record<string, unknown>;
  const name = labelFromKey(r.Name, r.Name_Localised);
  return name ? { name, state: asString(r.FactionState) ?? "None" } : null;
}

function factionState(record: Record<string, unknown>): FactionState | null {
  const named = namedFaction(record);
  if (!named) {
    return null;
  }
  const states = (key: string) =>
    asRecordList(record[key])
      .map((entry) => asString(entry.State))
      .filter((state): state is string => nonNull(state) && state !== "None");
  return {
    ...named,
    activeStates: states("ActiveStates"),
    pendingStates: states("PendingStates"),
  };
}

function positionFrom(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) {
    return null;
  }
  const [x, y, z] = value.map(asNumber);
  return x === null || y === null || z === null ? null : [x, y, z];
}

function powerplayFrom(event: RawJournalEvent): PowerplayInfo {
  return {
    powers: asStringList(event.Powers).filter((power) => power.trim() !== ""),
    state: asString(event.PowerplayState),
    controllingPower: asString(event.ControllingPower),
  };
}

/** System details from a `Location`, `FSDJump` or `CarrierJump` event. */
function systemFromEvent(event: RawJournalEvent): SystemInfo | null {
  const name = asString(event.StarSystem);
  if (!name) {
    return null;
  }
  const factions = asRecordList(event.Factions)
    .map(factionState)
    .filter(nonNull);
  const systemFaction = namedFaction(event.SystemFaction);
  // The system faction is also in the list, which carries its active states.
  const controllingFaction =
    factions.find((faction) => systemFaction && faction.name === systemFaction.name) ??
    (systemFaction ? { ...systemFaction, activeStates: [], pendingStates: [] } : factions[0]) ??
    null;
  return {
    name,
    address: asNumber(event.SystemAddress),
    position: positionFrom(event.StarPos),
    allegiance: asString(event.SystemAllegiance),
    economy: labelFromKey(event.SystemEconomy, event.SystemEconomy_Localised),
    secondEconomy: labelFromKey(event.SystemSecondEconomy, event.SystemSecondEconomy_Localised),
    government: labelFromKey(event.SystemGovernment, event.SystemGovernment_Localised),
    security: labelFromKey(event.SystemSecurity, event.SystemSecurity_Localised),
    population: asNumber(event.Population),
    arrivalBody: asString(event.Body),
    arrivalBodyType: asString(event.BodyType),
    controllingFaction,
    powerplay: powerplayFrom(event),
    factions,
    conflicts: asRecordList(event.Conflicts).map((conflict) => ({
      type: asString(conflict.WarType) ?? "Conflict",
      status: asString(conflict.Status) ?? "",
    })),
  };
}

/** Station details from a `Docked` event, or the station block of a `Location` event. */
function stationFromEvent(event: RawJournalEvent): StationInfo | null {
  const name = asString(event.StationName) ?? labelFromKey(event.StationName_Localised);
  if (!name) {
    return null;
  }
  const landingPads: unknown = event.LandingPads;
  const padsRecord =
    typeof landingPads === "object" && landingPads !== null
      ? (landingPads as Record<string, unknown>)
      : {};
  const small = asNumber(padsRecord.Small);
  const medium = asNumber(padsRecord.Medium);
  const large = asNumber(padsRecord.Large);
  return {
    name,
    type: asString(event.StationType),
    marketId: asNumber(event.MarketID),
    distanceFromStarLs: asNumber(event.DistFromStarLS),
    pads:
      small !== null && medium !== null && large !== null ? { small, medium, large } : null,
    services: asStringList(event.StationServices).filter((service) => service.trim() !== ""),
    economy: labelFromKey(event.StationEconomy, event.StationEconomy_Localised),
    allegiance: asString(event.StationAllegiance),
    government: labelFromKey(event.StationGovernment, event.StationGovernment_Localised),
    faction: namedFaction(event.StationFaction),
  };
}

function shipFromLoadout(event: RawJournalEvent, previous: ShipInfo | null): ShipInfo | null {
  const symbolicName = asString(event.Ship);
  if (!symbolicName) {
    return previous;
  }
  const resolved = resolveShip(symbolicName);
  const fuelCapacity: unknown = event.FuelCapacity;
  return {
    symbolicName,
    className: resolved?.className ?? humaniseId(symbolicName),
    known: resolved?.known ?? false,
    padSize: resolved?.padSize ?? "L",
    name: asString(event.ShipName),
    ident: asString(event.ShipIdent),
    maxJumpRange: asNumber(event.MaxJumpRange),
    cargoCapacity: asNumber(event.CargoCapacity),
    fuelCapacity: asNumber((fuelCapacity as Record<string, unknown> | null | undefined)?.Main),
    rebuy: asNumber(event.Rebuy),
  };
}

function cargoFromEvent(event: RawJournalEvent, capacity: number | null): CargoInfo | null {
  // `Vessel` is "Shipyard" for cargo stored with a ship, not what is being flown.
  if (asString(event.Vessel) !== "Ship") {
    return null;
  }
  const items = asRecordList(event.Inventory)
    .map((item) => ({
      name: asString(item.Name_Localised) ?? humaniseId(asString(item.Name) ?? ""),
      count: asNumber(item.Count) ?? 0,
      stolen: item.Stolen === true,
    }))
    .filter((item) => item.count > 0);
  return {
    carried: asNumber(event.Count) ?? items.reduce((total, item) => total + item.count, 0),
    capacity,
    items,
  };
}

/**
 * Fold one journal event into the commander's state. Returns the same object only
 * for events that carry nothing new; callers can treat every result as a change.
 *
 * `now` is wall-clock time in milliseconds, used to age out a jump that was abandoned.
 */
export function applyJournalEvent(
  state: CommanderState,
  event: RawJournalEvent,
  now: number = Date.now(),
): CommanderState {
  const motion: MotionState = { ...state.motion };
  const next: CommanderState = { ...state, motion };
  let system = state.system;
  let station = state.station;
  let lastStation = state.lastStation;
  let ship = state.ship;
  let cargo = state.cargo;
  let client = state.client;

  switch (event.event) {
    case "Fileheader": {
      client = { ...client, gameVersion: asString(event.gameversion), gameBuild: asString(event.build) };
      break;
    }
    case "LoadGame": {
      next.commanderName = asString(event.Commander) ?? next.commanderName;
      next.gameMode = asString(event.GameMode) ?? next.gameMode;
      client = { ...client, odyssey: asBoolean(event.Odyssey) };
      break;
    }
    case "Commander": {
      next.commanderName = asString(event.Name) ?? next.commanderName;
      break;
    }
    case "Location": {
      system = systemFromEvent(event) ?? system;
      const located = stationFromEvent(event);
      const docked = event.Docked === true;
      // On foot inside a station the journal reports Docked false but still names it.
      station = docked || (event.OnFoot === true && located) ? located : null;
      Object.assign(motion, {
        docked: docked || (event.OnFoot === true && Boolean(located)),
        onFoot: event.OnFoot === true,
        inSrv: event.InSRV === true,
        supercruise: false,
        jumpingTo: null,
        jumpingSince: null,
        approaching: null,
        destroyed: false,
      });
      break;
    }
    case "FSDJump": {
      system = systemFromEvent(event) ?? system;
      station = null;
      Object.assign(motion, {
        docked: false,
        supercruise: true,
        onFoot: false,
        inSrv: false,
        landed: false,
        jumpingTo: null,
        jumpingSince: null,
        approaching: null,
      });
      break;
    }
    case "CarrierJump": {
      system = systemFromEvent(event) ?? system;
      const docked = event.Docked === true;
      station = docked ? stationFromEvent(event) : null;
      Object.assign(motion, {
        docked,
        supercruise: !docked,
        onFoot: event.OnFoot === true,
        jumpingTo: null,
        jumpingSince: null,
        approaching: null,
      });
      break;
    }
    case "Docked": {
      station = stationFromEvent(event) ?? station;
      system = system ?? systemFromEvent(event);
      Object.assign(motion, {
        docked: true,
        supercruise: false,
        onFoot: false,
        inSrv: false,
        landed: false,
        jumpingTo: null,
        jumpingSince: null,
        approaching: null,
      });
      break;
    }
    case "Undocked": {
      if (station) {
        lastStation = { name: station.name, system: system?.name ?? "" };
      }
      station = null;
      Object.assign(motion, { docked: false, supercruise: true, onFoot: false, approaching: null });
      break;
    }
    case "Loadout": {
      ship = shipFromLoadout(event, ship);
      break;
    }
    case "Cargo": {
      cargo = cargoFromEvent(event, ship?.cargoCapacity ?? null);
      break;
    }
    case "StartJump": {
      if (event.JumpType === "Hyperspace") {
        Object.assign(motion, {
          jumpingTo: asString(event.StarSystem),
          jumpingSince: now,
          docked: false,
          supercruise: false,
          landed: false,
          approaching: null,
        });
      } else {
        Object.assign(motion, { supercruise: true, docked: false });
      }
      break;
    }
    case "SupercruiseEntry": {
      Object.assign(motion, { supercruise: true, docked: false, landed: false, approaching: null });
      break;
    }
    case "SupercruiseExit": {
      const body = asString(event.Body);
      const bodyType = asString(event.BodyType);
      Object.assign(motion, {
        supercruise: false,
        approaching: body && bodyType && bodyType !== "Null" ? { body, bodyType } : null,
      });
      break;
    }
    case "Touchdown": {
      Object.assign(motion, { landed: true, supercruise: false });
      break;
    }
    case "Liftoff": {
      Object.assign(motion, { landed: false, supercruise: false });
      break;
    }
    case "Embark": {
      // Getting into an SRV, or back into the ship from an SRV or on foot.
      Object.assign(motion, { onFoot: false, inSrv: event.SRV === true });
      break;
    }
    case "Disembark": {
      // Getting out of the ship either into an SRV or on foot.
      Object.assign(motion, { onFoot: event.SRV !== true, inSrv: event.SRV === true });
      break;
    }
    case "LaunchSRV": {
      motion.inSrv = true;
      break;
    }
    case "DockSRV": {
      motion.inSrv = false;
      break;
    }
    case "Died": {
      motion.destroyed = true;
      break;
    }
    case "Resurrect": {
      motion.destroyed = false;
      break;
    }
    case "Shutdown":
      break;
  }

  next.client = client;
  next.system = system;
  next.station = station;
  next.lastStation = lastStation;
  next.ship = ship;
  next.cargo = cargo;
  next.lastEvent = {
    name: event.event,
    timestamp: asString(event.timestamp) ?? state.lastEvent?.timestamp ?? null,
  };
  return next;
}

/** A hyperspace jump that has not completed within this long was abandoned. */
const JUMP_STALE_AFTER_MS = 90_000;

export interface Activity {
  label: string;
  detail: string | null;
}

/** What the commander is doing right now, in one line. */
export function describeActivity(state: CommanderState, now: number = Date.now()): Activity {
  const { motion, system, station } = state;
  const arrival = system?.arrivalBody;
  if (motion.destroyed) {
    return { label: "Ship destroyed", detail: "waiting on the rebuy screen" };
  }
  if (motion.onFoot) {
    return { label: "On foot", detail: station ? `at ${station.name}` : arrival ? `on ${arrival}` : null };
  }
  if (motion.inSrv) {
    return { label: "In SRV", detail: arrival ? `on ${arrival}` : null };
  }
  if (motion.docked && station) {
    return { label: "Docked", detail: `at ${station.name}` };
  }
  const jumpStale =
    motion.jumpingSince !== null && now - motion.jumpingSince > JUMP_STALE_AFTER_MS;
  if (motion.jumpingTo && !jumpStale) {
    return { label: "Hyperspace", detail: `jumping to ${motion.jumpingTo}` };
  }
  if (motion.landed) {
    return { label: "Landed", detail: arrival ? `on ${arrival}` : null };
  }
  if (motion.supercruise) {
    return {
      label: "Supercruise",
      detail: motion.approaching ? `approaching ${motion.approaching.body}` : system ? `in ${system.name}` : null,
    };
  }
  // Dropped out of supercruise and lining up on a station, planet or ring.
  return {
    label: "In flight",
    detail: motion.approaching ? `approaching ${motion.approaching.body}` : system ? `in ${system.name}` : null,
  };
}
