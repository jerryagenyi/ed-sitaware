import type { RawJournalEvent } from "@/lib/journal/fields";
import type { ConnectionStatus, JournalSourceKind } from "@/store/commander";

/** Everything a journal source may report back to the app. */
export interface JournalSink {
  /** The source has attached to a journal file and is reading it from the start. */
  onSession: (session: {
    fileName: string;
    source: JournalSourceKind;
    folderName: string | null;
  }) => void;
  onEvents: (events: RawJournalEvent[], receivedAt: number) => void;
  onStatus: (patch: Partial<ConnectionStatus>) => void;
}

/**
 * Something that follows a commander's journal and reports what it finds. The browser
 * build watches a folder the player picked; the desktop build will use a native file
 * watcher behind this same interface, and demo mode replays a sample session.
 */
export interface JournalSource {
  start(): Promise<void>;
  stop(): void;
}
