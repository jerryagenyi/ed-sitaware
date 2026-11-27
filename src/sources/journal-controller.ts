import {
  canReadLocalFolders,
  pickJournalDirectory,
  type ReadableDirectoryHandle,
} from "@/lib/fsa/directory-access";
import {
  clearDirectoryHandle,
  loadDirectoryHandle,
  saveDirectoryHandle,
} from "@/lib/fsa/directory-store";
import { readDroppedFolder, type DropCarrier } from "@/lib/fsa/drag-drop";
import { INITIAL_CONNECTION, useCommanderStore } from "@/store/commander";
import { DemoJournalSource } from "./demo-journal-source";
import { DEMO_LINES } from "./demo/sample-journal";
import { FileSystemJournalSource } from "./file-system-journal-source";
import type { JournalSink, JournalSource } from "./journal-source";

export type PickOutcome = "started" | "cancelled" | "unsupported";
export type DropOutcome = "started" | "file" | "unsupported" | "nothing";

/**
 * Owns whichever journal source is running and feeds it into the stores. Components
 * only ever talk to this, so connecting from a button, dropping a folder, restoring
 * on load and the demo mode all share one set of rules.
 */
export class JournalController {
  private source: JournalSource | null = null;
  /** Bumped by `stop()` so an async connect that is still waiting gives up. */
  private generation = 0;

  private readonly sink: JournalSink = {
    onSession: ({ fileName, source, folderName }) => {
      const store = useCommanderStore.getState();
      store.resetSession();
      store.setConnection({
        fileName,
        source,
        folderName,
        state: "live",
        lastReceivedAt: null,
        error: null,
      });
    },
    onEvents: (events, receivedAt) => {
      const store = useCommanderStore.getState();
      store.ingest(events);
      store.setConnection({ lastReceivedAt: receivedAt, state: "live", error: null });
    },
    onStatus: (patch) => useCommanderStore.getState().setConnection(patch),
  };

  /**
   * On load: pick up the folder from an earlier visit if the browser still lets us
   * read it. Otherwise remember its name so the connect panel can offer it back.
   */
  async restore(): Promise<void> {
    const generation = this.generation;
    const handle = await loadDirectoryHandle().catch(() => null);
    if (!handle || generation !== this.generation) {
      return;
    }
    const permission = await handle.queryPermission?.({ mode: "read" }).catch(() => "prompt");
    if (generation !== this.generation) {
      return;
    }
    if (permission === "granted") {
      await this.start(new FileSystemJournalSource(handle, this.sink), generation);
    } else {
      useCommanderStore.getState().setConnection({ storedFolderName: handle.name });
    }
  }

  /** The player just clicked "choose folder": ask for one and start watching it. */
  async pickDirectory(): Promise<PickOutcome> {
    if (!canReadLocalFolders()) {
      useCommanderStore.getState().setConnection({ state: "unsupported", error: null });
      return "unsupported";
    }
    const generation = this.generation;
    let handle: ReadableDirectoryHandle | null;
    try {
      handle = await pickJournalDirectory();
    } catch {
      // The function exists but the browser could not open its picker.
      useCommanderStore.getState().setConnection({ state: "unsupported", error: null });
      return "unsupported";
    }
    if (!handle || generation !== this.generation) {
      return "cancelled";
    }
    await this.connect(handle, generation);
    return "started";
  }

  /** The player dragged the journal folder onto the page instead of picking it. */
  async dropDirectory(event: DropCarrier): Promise<DropOutcome> {
    const generation = this.generation;
    const dropped = await readDroppedFolder(event);
    if (dropped === null) {
      return "nothing";
    }
    if (typeof dropped === "string") {
      return dropped;
    }
    if (generation !== this.generation) {
      return "nothing";
    }
    await this.connect(dropped, generation);
    return "started";
  }

  /** The browser remembered the folder but wants a click before reading it again. */
  async reconnectStored(): Promise<boolean> {
    const handle = await loadDirectoryHandle().catch(() => null);
    if (!handle) {
      return false;
    }
    const generation = this.generation;
    const permission = await handle.requestPermission?.({ mode: "read" }).catch(() => "denied");
    if (permission !== "granted" || generation !== this.generation) {
      return false;
    }
    await this.start(new FileSystemJournalSource(handle, this.sink), generation);
    return true;
  }

  startDemo(): void {
    this.stop();
    void this.start(new DemoJournalSource(DEMO_LINES, this.sink), this.generation);
  }

  /** Stop watching but keep everything the player set up. What was on screen is cleared. */
  disconnect(): void {
    this.stop();
    const { storedFolderName } = useCommanderStore.getState().connection;
    useCommanderStore.getState().resetSession();
    useCommanderStore.getState().setConnection({
      ...INITIAL_CONNECTION,
      storedFolderName,
      state: "disconnected",
    });
  }

  /** Stop watching and forget the folder so nothing is offered next visit. */
  async forget(): Promise<void> {
    this.stop();
    await clearDirectoryHandle().catch(() => undefined);
    useCommanderStore.getState().resetSession();
    useCommanderStore.getState().setConnection({ ...INITIAL_CONNECTION, state: "disconnected" });
  }

  stop(): void {
    this.generation += 1;
    this.source?.stop();
    this.source = null;
  }

  /** Remember a folder the player handed over, picked or dropped, and start watching it. */
  private async connect(handle: ReadableDirectoryHandle, generation: number): Promise<void> {
    await saveDirectoryHandle(handle).catch(() => undefined);
    await this.start(new FileSystemJournalSource(handle, this.sink), generation);
  }

  private async start(source: JournalSource, generation: number): Promise<void> {
    if (generation !== this.generation) {
      source.stop();
      return;
    }
    this.source?.stop();
    this.source = source;
    await source.start();
  }
}

/** The one controller the app uses. */
export const journal = new JournalController();
