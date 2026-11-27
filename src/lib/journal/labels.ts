/**
 * The journal labels many values with a localisation key such as `$SYSTEM_SECURITY_high;`
 * or `$GAlAXY_MAP_INFO_state_anarchy;`. Turn the key into a readable label, preferring
 * the `_Localised` value when the game supplied one.
 */
export function labelFromKey(value: unknown, localised?: unknown): string | null {
  if (typeof localised === "string" && localised.length > 0) {
    return localised;
  }
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const bare = value.replace(/^\$/, "").replace(/;$/, "");
  if (bare === "" || bare.toLowerCase() === "none") {
    return null;
  }
  const lastSegment = bare.slice(bare.lastIndexOf("_") + 1).trim();
  if (lastSegment === "" || lastSegment.toLowerCase() === "none") {
    return null;
  }
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
}

/** Split camel-case ids such as `CombatPerformanceStabilisers` into a sentence-case label. */
export function humaniseId(id: string): string {
  const spaced = id.replace(/([a-z\d])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Service ids as `StationServices` lists them (`materialtrader`, `techBroker`, `dock`, …). */
const SERVICE_LABELS: Record<string, string> = {
  refuel: "Refuel",
  repair: "Repair",
  rearm: "Rearm",
  restock: "Restock",
  commodities: "Commodities",
  blackmarket: "Black market",
  outfitting: "Outfitting",
  shipyard: "Shipyard",
  materialtrader: "Material trader",
  techbroker: "Tech broker",
  facilitator: "Interstellar factors",
  autodock: "Autodock",
  exploration: "Universal Cartographics",
  vistagenomics: "Vista Genomics",
  engineer: "Engineer",
  tuning: "Workshop",
  missions: "Missions",
  missionsgenerated: "Mission board",
  contacts: "Contacts",
  crewlounge: "Crew lounge",
  livery: "Livery",
  refinery: "Refinery",
  pioneersupplies: "Pioneer supplies",
  apexinterstellar: "Apex Interstellar",
  frontlinesolutions: "Frontline Solutions",
  searchrescue: "Search and rescue",
  powerplay: "Powerplay",
  dock: "Dock",
  ondockmission: "On-dock mission",
  carrierfuel: "Carrier fuel",
  carriermanagement: "Carrier management",
  carriervendor: "Carrier vendor",
  bartender: "Bar",
  socialspace: "Social space",
  shop: "Shop",
  stationmenu: "Station menu",
  stationoperations: "Station operations",
  flightcontroller: "Flight controller",
  modulepacks: "Module packs",
  registeringcolonisation: "Colonisation registration",
  colonisationcontribution: "Colonisation contribution",
  voucherredemption: "Voucher redemption",
  squadronbank: "Squadron bank",
};

/** The game writes these ids with inconsistent casing, so match them case-insensitively. */
export function serviceLabel(id: string): string {
  const key = id.toLowerCase();
  return SERVICE_LABELS[key] ?? humaniseId(id);
}

/**
 * Services worth a glance on the station card, in display order. Everything else a
 * station offers (dock, contacts, social space…) is routine and left off.
 */
const NOTABLE_SERVICES: readonly string[] = [
  "refuel",
  "repair",
  "rearm",
  "commodities",
  "outfitting",
  "shipyard",
  "blackmarket",
  "materialtrader",
  "techbroker",
  "facilitator",
  "autodock",
  "exploration",
  "vistagenomics",
  "engineer",
  "tuning",
  "apexinterstellar",
  "frontlinesolutions",
  "pioneersupplies",
  "refinery",
];

/** Labels for the notable services a station has, or "No services listed". */
export function notableServices(services: readonly string[]): string[] {
  const present = new Set(services.map((id) => id.toLowerCase()));
  return NOTABLE_SERVICES.filter((id) => present.has(id)).map(serviceLabel);
}

const STATION_TYPE_LABELS: Record<string, string> = {
  coriolis: "Coriolis",
  orbis: "Orbis",
  ocellus: "Ocellus",
  outpost: "Outpost",
  asteroidbase: "Asteroid base",
  bernal: "Bernal orbital",
  megaship: "Megaship",
  fleetcarrier: "Fleet carrier",
  dodec: "Dodec station",
  crateroutpost: "Crater outpost",
  craterport: "Crater port",
  surfacestation: "Surface station",
  onfootsettlement: "Settlement",
};

export function stationTypeLabel(type: string | null | undefined): string | null {
  if (!type) {
    return null;
  }
  const key = type.toLowerCase();
  return STATION_TYPE_LABELS[key] ?? humaniseId(type);
}

/** Ports on a planet's surface: no large pads, and the gravity that goes with them. */
const SURFACE_TYPES: ReadonlySet<string> = new Set(["craterport", "crateroutpost", "surfacestation"]);

export function isSurfaceStation(type: string | null | undefined): boolean {
  return type !== null && type !== undefined && SURFACE_TYPES.has(type.toLowerCase());
}

export function isFleetCarrier(type: string | null | undefined): boolean {
  return type !== null && type !== undefined && type.toLowerCase() === "fleetcarrier";
}
