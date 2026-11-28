import type { RawJournalEvent } from "./fields";

/**
 * Journal events this app reads. Every other line is skipped before it is parsed,
 * so a multi-megabyte `Materials`, `Loadout.Modules` or `NavRoute` line costs nothing.
 */
export const HANDLED_EVENTS: ReadonlySet<string> = new Set([
  // Session
  "Fileheader",
  "LoadGame",
  "GameModeChange",
  "Commander",
  "Shutdown",
  // Ship
  "Loadout",
  "Cargo",
  // Where the commander is
  "Location",
  "FSDJump",
  "CarrierJump",
  "Docked",
  "Undocked",
  "StartJump",
  "SupercruiseEntry",
  "SupercruiseExit",
  "Touchdown",
  "Liftoff",
  "Embark",
  "Disembark",
  "LaunchSRV",
  "DockSRV",
  "Died",
  "Resurrect",
]);

// The event name always sits next to its key, wherever it is in the line.
const EVENT_NAME = /"event"\s*:\s*"([A-Za-z_]+)"/;

export type ParsedLine =
  | { kind: "event"; event: RawJournalEvent }
  /** Blank, or an event this app does not read. */
  | { kind: "ignored" }
  /** An event this app does read, but the line is not valid JSON. */
  | { kind: "invalid" };

/** Journal lines are UTF-8 and may start with a byte-order mark. */
function stripByteOrderMark(line: string): string {
  return line.charCodeAt(0) === 0xfeff ? line.slice(1) : line;
}

export function parseJournalLine(line: string): ParsedLine {
  const text = stripByteOrderMark(line);
  if (text.trim() === "") {
    return { kind: "ignored" };
  }
  const name = EVENT_NAME.exec(text)?.[1];
  if (!name || !HANDLED_EVENTS.has(name)) {
    return { kind: "ignored" };
  }
  try {
    const event: unknown = JSON.parse(text);
    if (typeof event !== "object" || event === null) {
      return { kind: "invalid" };
    }
    return { kind: "event", event: event as RawJournalEvent };
  } catch {
    return { kind: "invalid" };
  }
}

/**
 * Turns freshly read bytes into complete journal lines. The game can be mid-write when
 * a poll reads the file, so an unterminated tail is held back until its newline arrives.
 */
export class LineBuffer {
  private decoder = new TextDecoder();
  private pending = "";

  push(chunk: Uint8Array): string[] {
    this.pending += this.decoder.decode(chunk, { stream: true });
    return this.takeCompleteLines();
  }

  get hasPending(): boolean {
    return this.pending.length > 0;
  }

  reset(): void {
    this.decoder = new TextDecoder();
    this.pending = "";
  }

  private takeCompleteLines(): string[] {
    const lines: string[] = [];
    let newline = this.pending.indexOf("\n");
    while (newline !== -1) {
      lines.push(this.pending.slice(0, newline));
      this.pending = this.pending.slice(newline + 1);
      newline = this.pending.indexOf("\n");
    }
    return lines;
  }
}
