import type { ReadableDirectoryHandle } from "@/lib/fsa/directory-access";
import type { RawJournalEvent } from "@/lib/journal/fields";
import {
  compareJournalFileNames,
  newestJournal,
  type JournalFileName,
} from "@/lib/journal/files";
import { LineBuffer, parseJournalLine } from "@/lib/journal/parse";
import type { JournalSink, JournalSource } from "./journal-source";

export interface PollOptions {
  /** How often to look for new lines while the game is writing. */
  fastPollMs: number;
  /** How often to look once the journal has gone quiet. */
  slowPollMs: number;
  /** A journal this quiet, in milliseconds, counts as idle. */
  idleAfterMs: number;
  /** How often to list the folder for a newer session while events are arriving. */
  rescanActiveMs: number;
  /** How often to list the folder for a newer session while idle. */
  rescanIdleMs: number;
}

/**
 * Browsers give no notification when a file grows, so the journal is polled. A poll
 * that finds nothing costs one metadata read. While the commander is playing it runs
 * four times a second, which keeps the display within a quarter-second of the game;
 * once the journal goes quiet (or the session ends) it drops back.
 */
export const POLL: PollOptions = {
  fastPollMs: 250,
  slowPollMs: 1000,
  idleAfterMs: 5 * 60_000,
  rescanActiveMs: 10_000,
  rescanIdleMs: 5_000,
};

interface JournalFile {
  handle: FileSystemFileHandle;
  parsed: JournalFileName;
}

function describeReadError(error: unknown): string {
  if (error instanceof Error && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return "Access to the journal folder was withdrawn. Reconnect to keep watching.";
  }
  return "The journal folder could not be read. Reconnect to try again.";
}

async function* listEntries(
  directory: ReadableDirectoryHandle,
): AsyncIterableIterator<[string, FileSystemHandle]> {
  if (directory.entries) {
    yield* directory.entries();
    return;
  }
  if (directory.values) {
    for await (const handle of directory.values()) {
      yield [handle.name, handle];
    }
    return;
  }
  throw new Error("This browser cannot list the folder.");
}

/** Follows the newest `Journal.*.log` in a folder the player chose. */
export class FileSystemJournalSource implements JournalSource {
  private current: JournalFile | null = null;
  private buffer = new LineBuffer();
  /** Byte offset of the next unread part of the current file. */
  private offset = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private scanned = false;
  private lastProgressAt = 0;
  private lastScanAt = 0;
  private sessionEnded = false;

  constructor(
    private readonly directory: ReadableDirectoryHandle,
    private readonly sink: JournalSink,
    private readonly options: PollOptions = POLL,
    private readonly now: () => number = Date.now,
  ) {}

  async start(): Promise<void> {
    this.stopped = false;
    this.scanned = false;
    this.lastProgressAt = this.now();
    this.sink.onStatus({
      state: "connecting",
      source: "file",
      folderName: this.directory.name,
      error: null,
    });
    // The first tick lists the folder and reads the newest journal straight away.
    await this.tick();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(delayMs: number): void {
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.tick();
    }, delayMs);
  }

  private async tick(): Promise<void> {
    if (this.stopped) {
      return;
    }
    try {
      if (!this.scanned || this.now() - this.lastScanAt >= this.rescanInterval()) {
        await this.scan(!this.scanned);
      }
      await this.readNewBytes();
    } catch (error) {
      if (this.stopped) {
        return;
      }
      this.stop();
      this.sink.onStatus({ state: "error", error: describeReadError(error) });
      return;
    }
    if (!this.stopped) {
      this.schedule(this.pollInterval());
    }
  }

  private isIdle(): boolean {
    return this.sessionEnded || this.now() - this.lastProgressAt > this.options.idleAfterMs;
  }

  private pollInterval(): number {
    return this.isIdle() ? this.options.slowPollMs : this.options.fastPollMs;
  }

  private rescanInterval(): number {
    return this.isIdle() ? this.options.rescanIdleMs : this.options.rescanActiveMs;
  }

  /** Find the newest journal. A newer one than the one being read means a new session. */
  private async scan(initial: boolean): Promise<void> {
    this.lastScanAt = this.now();
    this.scanned = true;
    const candidates: { name: string; handle: FileSystemFileHandle }[] = [];
    for await (const [name, handle] of listEntries(this.directory)) {
      if (handle.kind === "file" && name.startsWith("Journal.")) {
        candidates.push({ name, handle: handle as FileSystemFileHandle });
      }
    }
    const newest = newestJournal(candidates);
    if (!newest) {
      if (initial) {
        this.sink.onStatus({ state: "empty", pollIntervalMs: this.pollInterval() });
      }
      return;
    }
    if (this.current && compareJournalFileNames(newest.parsed, this.current.parsed) <= 0) {
      return;
    }
    this.current = { handle: newest.file.handle, parsed: newest.parsed };
    this.offset = 0;
    this.buffer.reset();
    this.sessionEnded = false;
    this.lastProgressAt = this.now();
    this.sink.onSession({
      fileName: newest.parsed.name,
      source: "file",
      folderName: this.directory.name,
    });
    this.sink.onStatus({ state: "live", fileName: newest.parsed.name, error: null });
  }

  /** Read whatever has been appended to the current file since last time. */
  private async readNewBytes(): Promise<void> {
    if (!this.current) {
      return;
    }
    const file = await this.current.handle.getFile();
    // Shorter than before means the file was replaced: start it over.
    if (file.size < this.offset) {
      this.offset = 0;
      this.buffer.reset();
    }
    if (file.size === this.offset) {
      return;
    }
    const chunk = new Uint8Array(await file.slice(this.offset, file.size).arrayBuffer());
    this.offset = file.size;
    const events: RawJournalEvent[] = [];
    for (const line of this.buffer.push(chunk)) {
      const parsed = parseJournalLine(line);
      if (parsed.kind === "event") {
        events.push(parsed.event);
      }
    }
    if (events.length === 0) {
      return;
    }
    const now = this.now();
    this.lastProgressAt = now;
    this.sessionEnded = events.some((event) => event.event === "Shutdown");
    this.sink.onEvents(events, now);
    this.sink.onStatus({ pollIntervalMs: this.pollInterval() });
  }
}
