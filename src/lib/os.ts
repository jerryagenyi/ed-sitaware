export type Platform = "windows" | "linux" | "other";

export interface JournalLocation {
  /** The system this location belongs to, as a reader would name it. */
  system: string;
  /** What to paste into the folder picker's address bar, or a file manager's. */
  path: string;
  /** Where it sits, in a sentence that can follow "it is". */
  where: string;
  /** What to do when the path does not work. */
  fallback: string;
}

/**
 * Where Elite Dangerous writes its journal. It is never the folder the game is
 * installed in: on Windows it is the account's "Saved Games" folder, and on Linux it
 * is inside the Proton prefix the game runs in.
 */
export const JOURNAL_LOCATIONS: Record<Exclude<Platform, "other">, JournalLocation> = {
  windows: {
    system: "Windows",
    path: "%USERPROFILE%\\Saved Games\\Frontier Developments\\Elite Dangerous",
    where: "in the Saved Games folder of the Windows account you play under, wherever the game itself lives",
    fallback:
      "Press Win+R, type shell:savedgames and press Enter: that opens the real Saved Games folder even if it has been moved to another drive. Inside, open Frontier Developments, then Elite Dangerous. If you play under a different Windows account, it is in that account's folder.",
  },
  linux: {
    system: "Linux (through Steam Proton)",
    path: "steamapps/compatdata/359320/pfx/drive_c/users/steamuser/Saved Games/Frontier Developments/Elite Dangerous",
    where: "inside the game's Proton prefix, under your Steam library",
    fallback:
      "In your Steam library folder, open steamapps, then compatdata, then 359320, and follow the path from there.",
  },
};

/** The location to show. Windows is the sensible default when the system is unknown. */
export function journalLocation(platform: Platform): JournalLocation {
  return JOURNAL_LOCATIONS[platform === "linux" ? "linux" : "windows"];
}

/** The location for whichever system was not recognised as the player's. */
export function otherLocation(platform: Platform): JournalLocation | null {
  if (platform === "linux") {
    return JOURNAL_LOCATIONS.windows;
  }
  if (platform === "windows") {
    return JOURNAL_LOCATIONS.linux;
  }
  return null;
}

/**
 * Best guess at the player's system from what the browser reports. Phones and
 * tablets are "other": they cannot read local folders whichever way they report.
 */
export function detectPlatform(reported: { platform?: string; userAgent?: string } | null | undefined): Platform {
  const hints = `${reported?.platform ?? ""} ${reported?.userAgent ?? ""}`.toLowerCase();
  if (hints.includes("windows")) {
    return "windows";
  }
  if (/\b(android|iphone|ipad|macintosh|mac os x)\b/.test(hints)) {
    return "other";
  }
  if (hints.includes("linux") || hints.includes("cros")) {
    return "linux";
  }
  return "other";
}
