import type { JournalSink, JournalSource } from "./journal-source";
import type { DemoLine } from "./demo/sample-journal";

export const DEMO_SESSION_NAME = "Demo session";

/** Replays a sample journal on a timer so the dashboard can be shown without the game. */
export class DemoJournalSource implements JournalSource {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private stopped = true;

  constructor(
    private readonly lines: readonly DemoLine[],
    private readonly sink: JournalSink,
    private readonly now: () => number = Date.now,
  ) {}

  async start(): Promise<void> {
    this.stopped = false;
    const startedAt = this.now();
    const first = this.lines[0]?.atMs ?? 0;
    this.sink.onSession({ fileName: DEMO_SESSION_NAME, source: "demo", folderName: null });
    this.sink.onStatus({
      state: "live",
      source: "demo",
      fileName: DEMO_SESSION_NAME,
      error: null,
      pollIntervalMs: null,
    });
    this.emitAt(first, startedAt);
    const seen = new Set<number>([first]);
    for (const { atMs } of this.lines) {
      if (seen.has(atMs)) {
        continue;
      }
      seen.add(atMs);
      this.timers.push(setTimeout(() => this.emitAt(atMs, startedAt), atMs - first));
    }
  }

  stop(): void {
    this.stopped = true;
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
  }

  /** "Write" every line scheduled for this moment. */
  private emitAt(atMs: number, startedAt: number): void {
    if (this.stopped) {
      return;
    }
    const receivedAt = this.now();
    // Timestamps follow the real clock so "last event" reads naturally.
    const events = this.lines
      .filter((line) => line.atMs === atMs)
      .map(({ event }) => ({
        ...event,
        timestamp: new Date(startedAt + atMs).toISOString(),
      }));
    if (events.length > 0) {
      this.sink.onEvents(events, receivedAt);
    }
  }
}
