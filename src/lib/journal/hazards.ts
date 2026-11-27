import { formatInt } from "@/lib/format";
import { isSurfaceStation } from "./labels";
import type { StationInfo, SystemInfo } from "./state";

export type HazardSeverity = "info" | "warn" | "danger";

export interface Hazard {
  /** Unique within everything shown together. */
  id: string;
  /** Hazards that mean the same thing share one, so they are shown once. */
  group: string;
  severity: HazardSeverity;
  label: string;
  detail: string | null;
}

const SEVERITY_ORDER: Record<HazardSeverity, number> = { danger: 0, warn: 1, info: 2 };

function bySeverity(a: Hazard, b: Hazard): number {
  return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
}

/** How much a faction state matters, or null when it is nothing to write home about. */
export function factionStateSeverity(state: string): HazardSeverity | null {
  return STATE_RULES[state]?.severity ?? null;
}

/** Gotchas about the station the commander is docked at. */
export function stationHazards(
  station: StationInfo | null,
  maxSupercruiseLs: number,
): Hazard[] {
  if (!station) {
    return [];
  }
  const hazards: Hazard[] = [];
  if (station.distanceFromStarLs !== null && station.distanceFromStarLs > maxSupercruiseLs) {
    hazards.push({
      id: "station-long-supercruise",
      group: "station:long-supercruise",
      severity: "warn",
      label: "Long supercruise",
      detail: `${formatInt(station.distanceFromStarLs)} Ls from the arrival star`,
    });
  }
  if (isSurfaceStation(station.type)) {
    hazards.push({
      id: "station-surface-port",
      group: "station:surface-port",
      severity: "info",
      label: "Planetary port",
      detail: "No large landing pads. Check the surface gravity before you commit.",
    });
  }
  hazards.push(...factionStateHazards("station", station.faction));
  return hazards.sort(bySeverity);
}

interface StateRule {
  severity: HazardSeverity;
  label: string;
  detail: string;
  /** Also worth a head-count for factions that do not control the system. */
  countedElsewhere: boolean;
}

/** Faction states worth knowing about before you fly in. */
const STATE_RULES: Record<string, StateRule> = {
  Lockdown: {
    severity: "danger",
    label: "Lockdown",
    detail: "Station services are restricted while the faction holds this state.",
    countedElsewhere: true,
  },
  InfrastructureFailure: {
    severity: "warn",
    label: "Infrastructure failure",
    detail: "The faction's infrastructure is failing and services may be reduced.",
    countedElsewhere: true,
  },
  PirateAttack: {
    severity: "warn",
    label: "Pirate attack",
    detail: "Traffic in the system is under attack. Expect pirates.",
    countedElsewhere: true,
  },
  CivilUnrest: {
    severity: "info",
    label: "Civil unrest",
    detail: "Security is reduced and crime is up.",
    countedElsewhere: false,
  },
  War: {
    severity: "info",
    label: "War",
    detail: "Conflict zones are active.",
    countedElsewhere: true,
  },
  CivilWar: {
    severity: "info",
    label: "Civil war",
    detail: "Conflict zones are active.",
    countedElsewhere: true,
  },
  Famine: {
    severity: "info",
    label: "Famine",
    detail: "Food is in short supply.",
    countedElsewhere: false,
  },
  Outbreak: {
    severity: "info",
    label: "Outbreak",
    detail: "Medical supplies are in demand.",
    countedElsewhere: false,
  },
  Blight: {
    severity: "info",
    label: "Blight",
    detail: "Agricultural worlds are suffering.",
    countedElsewhere: false,
  },
  Drought: {
    severity: "info",
    label: "Drought",
    detail: "Water is scarce.",
    countedElsewhere: false,
  },
};

function activeStates(faction: { state: string; activeStates: readonly string[] }): string[] {
  return [...new Set([faction.state, ...faction.activeStates])].filter(
    (state) => state !== "None",
  );
}

/** The states one faction is in, as hazards. `scope` keeps station and system ids apart. */
function factionStateHazards(
  scope: "station" | "system",
  faction: { name: string; state: string; activeStates?: readonly string[] } | null | undefined,
): Hazard[] {
  if (!faction) {
    return [];
  }
  const states = [...new Set([faction.state, ...(faction.activeStates ?? [])])].filter(
    (state) => state !== "None",
  );
  return states
    .filter((state) => STATE_RULES[state])
    .map((state) => ({
      id: `${scope}-faction-${faction.name}-${state}`,
      group: `faction:${faction.name}:${state}`,
      severity: STATE_RULES[state].severity,
      label: STATE_RULES[state].label,
      detail: `${faction.name} is in ${state}. ${STATE_RULES[state].detail}`,
    }));
}

/** Drop repeats of a warning that was already made, keeping the first (most severe) one. */
export function uniqueHazards(hazards: readonly Hazard[]): Hazard[] {
  const seen = new Set<string>();
  return hazards.filter((hazard) => {
    if (seen.has(hazard.group)) {
      return false;
    }
    seen.add(hazard.group);
    return true;
  });
}

/** Gotchas about the system the commander is in. */
export function systemHazards(system: SystemInfo | null): Hazard[] {
  if (!system) {
    return [];
  }
  const hazards: Hazard[] = [];
  hazards.push(...factionStateHazards("system", system.controllingFaction));
  const controlling = system.controllingFaction;

  const others = new Map<string, number>();
  for (const faction of system.factions) {
    if (controlling && faction.name === controlling.name) {
      continue;
    }
    for (const state of activeStates(faction)) {
      if (STATE_RULES[state]?.countedElsewhere) {
        others.set(state, (others.get(state) ?? 0) + 1);
      }
    }
  }
  for (const [state, count] of others) {
    hazards.push({
      id: `system-factions-${state}`,
      group: `factions:${state}`,
      severity: "info",
      label: `${count} faction${count === 1 ? "" : "s"} in ${STATE_RULES[state].label.toLowerCase()}`,
      detail: STATE_RULES[state].detail,
    });
  }
  return hazards.sort(bySeverity);
}
