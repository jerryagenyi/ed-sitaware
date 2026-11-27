export type PadSize = "S" | "M" | "L";

/**
 * Every flyable ship, keyed by the symbolic name the journal writes in `Loadout.Ship`
 * (the journal always uses lower case, e.g. `krait_mkii`). Pad sizes are cross-checked
 * against EDDI's ShipDefinitions.cs and INARA — see ARCHITECTURE.md §3.
 *
 * `Cutter` is the Imperial Cutter; the Federal Corvette is `federation_corvette`.
 * `empire_trader` is the Imperial Clipper and `independant_trader` the Keelback.
 */
const SHIPS = [
  ["adder", "Adder", "S"],
  ["cobramkiii", "Cobra Mk III", "S"],
  ["cobramkiv", "Cobra Mk IV", "S"],
  ["cobramkv", "Cobra Mk V", "S"],
  ["diamondbackxl", "Diamondback Explorer", "S"],
  ["diamondback", "Diamondback Scout", "S"],
  ["dolphin", "Dolphin", "S"],
  ["eagle", "Eagle", "S"],
  ["hauler", "Hauler", "S"],
  ["empire_courier", "Imperial Courier", "S"],
  ["empire_eagle", "Imperial Eagle", "S"],
  ["smallcombat01_nx", "Kestrel Mk II", "S"],
  ["sidewinder", "Sidewinder", "S"],
  ["viper", "Viper Mk III", "S"],
  ["viper_mkiv", "Viper Mk IV", "S"],
  ["vulture", "Vulture", "S"],
  ["typex_3", "Alliance Challenger", "M"],
  ["typex", "Alliance Chieftain", "M"],
  ["typex_2", "Alliance Crusader", "M"],
  ["asp", "Asp Explorer", "M"],
  ["asp_scout", "Asp Scout", "M"],
  ["corsair", "Corsair", "M"],
  ["federation_dropship_mkii", "Federal Assault Ship", "M"],
  ["federation_dropship", "Federal Dropship", "M"],
  ["federation_gunship", "Federal Gunship", "M"],
  ["ferdelance", "Fer-de-Lance", "M"],
  ["independant_trader", "Keelback", "M"],
  ["krait_mkii", "Krait Mk II", "M"],
  ["krait_light", "Krait Phantom", "M"],
  ["mediumtransport01", "Lynx Highliner", "M"],
  ["mamba", "Mamba", "M"],
  ["mandalay", "Mandalay", "M"],
  ["python", "Python", "M"],
  ["python_nx", "Python Mk II", "M"],
  ["type6", "Type-6 Transporter", "M"],
  ["type8", "Type-8 Transporter", "M"],
  ["lakonminer", "Type-11 Prospector", "M"],
  ["anaconda", "Anaconda", "L"],
  ["anacondamkii", "Anaconda Mk II", "L"],
  ["belugaliner", "Beluga Liner", "L"],
  ["explorer_nx", "Caspian Explorer", "L"],
  ["federation_corvette", "Federal Corvette", "L"],
  ["empire_trader", "Imperial Clipper", "L"],
  ["cutter", "Imperial Cutter", "L"],
  ["orca", "Orca", "L"],
  ["panthermkii", "Panther Clipper Mk II", "L"],
  ["type7", "Type-7 Transporter", "L"],
  ["type9", "Type-9 Heavy", "L"],
  ["type9_military", "Type-10 Defender", "L"],
] as const satisfies readonly (readonly [string, string, PadSize])[];

/**
 * Lower-case and drop separators so that `Krait_MkII`, `krait_mkii` and `Krait Mk. II`
 * all find the same row. The journal's own casing varies between events and game versions.
 */
export function normaliseShipName(raw: string): string {
  return raw.toLowerCase().replace(/[\s._]/g, "");
}

export const SHIP_COUNT = SHIPS.length;

const PAD_BY_ID = new Map<string, PadSize>();
const CLASS_BY_ID = new Map<string, string>();
for (const [id, className, pad] of SHIPS) {
  const key = normaliseShipName(id);
  PAD_BY_ID.set(key, pad);
  CLASS_BY_ID.set(key, className);
}

export interface ShipProfile {
  /** Normalised symbolic name, or null for a ship that is not in the table yet. */
  id: string | null;
  /** In-game class name, e.g. "Cobra Mk III". */
  className: string;
  padSize: PadSize;
  /**
   * False when the name is not in the table. `padSize` is then the fail-safe "L":
   * an over-filtered port list is annoying, a large ship sent to a Medium-only
   * outpost is a ruined trip.
   */
  known: boolean;
}

function humaniseShipName(raw: string): string {
  const spaced = raw.replace(/_/g, " ").replace(/([a-z\d])([A-Z])/g, "$1 $2").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function resolveShip(rawName: string | null | undefined): ShipProfile | null {
  if (!rawName) {
    return null;
  }
  const key = normaliseShipName(rawName);
  const padSize = PAD_BY_ID.get(key);
  if (padSize) {
    return { id: key, className: CLASS_BY_ID.get(key) ?? humaniseShipName(rawName), padSize, known: true };
  }
  return { id: null, className: humaniseShipName(rawName), padSize: "L", known: false };
}
