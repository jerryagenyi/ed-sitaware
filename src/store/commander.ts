import { create } from "zustand";
import type { RawJournalEvent } from "@/lib/journal/fields";
import {
  applyJournalEvent,
  INITIAL_COMMANDER_STATE,
  type CommanderState,
} from "@/lib/journal/state";

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "live"
  /** Watching a folder that holds no journal yet. */
  | "empty"
  | "error"
  /** The browser cannot read local folders. */
  | "unsupported";

export type JournalSourceKind = "file" | "demo";

export interface ConnectionStatus {
  state: ConnectionState;
  source: JournalSourceKind | null;
  folderName: string | null;
  fileName: string | null;
  /** Wall-clock time, in milliseconds, the last journal event was received. */
  lastReceivedAt: number | null;
  /** How often the source currently checks the journal, in milliseconds. */
  pollIntervalMs: number | null;
  error: string | null;
  /** A folder remembered from an earlier visit that still needs permission. */
  storedFolderName: string | null;
  /** Wall-clock time, in milliseconds, the state last changed. */
  changedAt: number | null;
}

export const INITIAL_CONNECTION: ConnectionStatus = {
  state: "disconnected",
  source: null,
  folderName: null,
  fileName: null,
  lastReceivedAt: null,
  pollIntervalMs: null,
  error: null,
  storedFolderName: null,
  changedAt: null,
};

interface CommanderStore {
  /** Everything the journal has told us so far. Never persisted. */
  commander: CommanderState;
  connection: ConnectionStatus;
  ingest: (events: readonly RawJournalEvent[]) => void;
  setConnection: (patch: Partial<ConnectionStatus>) => void;
  /** Start over because a new journal file is being read. */
  resetSession: () => void;
}

export const useCommanderStore = create<CommanderStore>((set) => ({
  commander: INITIAL_COMMANDER_STATE,
  connection: INITIAL_CONNECTION,

  ingest: (events) => {
    if (events.length === 0) {
      return;
    }
    const now = Date.now();
    set((state) => ({
      commander: events.reduce(
        (commander, event) => applyJournalEvent(commander, event, now),
        state.commander,
      ),
    }));
  },

  setConnection: (patch) =>
    set((state) => ({
      connection: {
        ...state.connection,
        ...patch,
        changedAt:
          patch.state !== undefined && patch.state !== state.connection.state
            ? Date.now()
            : state.connection.changedAt,
      },
    })),

  resetSession: () => set({ commander: INITIAL_COMMANDER_STATE }),
}));

/** Coarse connection state plus whether events are arriving right now. */
export type LinkStatus = ConnectionState | "idle";

export function linkStatusOf(connection: ConnectionStatus, now: number): LinkStatus {
  if (connection.state !== "live") {
    return connection.state;
  }
  const quietFor = connection.lastReceivedAt === null ? Infinity : now - connection.lastReceivedAt;
  return quietFor < 5000 ? "live" : "idle";
}
