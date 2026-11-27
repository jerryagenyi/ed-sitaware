// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RawJournalEvent } from "@/lib/journal/fields";
import type { ReadableDirectoryHandle } from "@/lib/fsa/directory-access";
import { INITIAL_CONNECTION, type ConnectionStatus } from "@/store/commander";
import { applyJournalEvent, describeActivity, INITIAL_COMMANDER_STATE } from "@/lib/journal/state";
import { FileSystemJournalSource } from "./file-system-journal-source";
import type { JournalSink } from "./journal-source";

/** The content of one fake journal file, re-read on every poll so a test can "write" to it. */
type FileContent = () => string;

const json = (event: Record<string, unknown>) => `${JSON.stringify(event)}\r\n`;

function fakeDirectory(name: string, files: Map<string, FileContent>): ReadableDirectoryHandle {
  return {
    name,
    kind: "directory",
    async *entries() {
      for (const [fileName, content] of files) {
        yield [fileName, { kind: "file", name: fileName, getFile: async () => new File([content()], fileName) }];
      }
    },
  } as unknown as ReadableDirectoryHandle;
}

function recorder() {
  const sessions: string[] = [];
  const events: RawJournalEvent[] = [];
  const statuses: Partial<ConnectionStatus>[] = [];
  const sink: JournalSink = {
    onSession: (session) => sessions.push(session.fileName),
    onEvents: (batch) => events.push(...batch),
    onStatus: (patch) => statuses.push(patch),
  };
  const latest = () => statuses.reduce<ConnectionStatus>(
    (merged, patch) => ({ ...merged, ...patch }),
    INITIAL_CONNECTION,
  );
  return { sink, sessions, events, latest };
}

const NEWEST = "Journal.2026-11-24T123720.01.log";

let files: Map<string, FileContent>;

beforeEach(() => {
  vi.useFakeTimers();
  files = new Map([
    [
      "Journal.2026-11-23T134541.01.log",
      () => json({ timestamp: "2026-11-23T13:45:41Z", event: "Location", StarSystem: "Old", Docked: false }),
    ],
    // Sorts after every current-format name but belongs to an older session.
    [
      "Journal.261113225523.01.log",
      () => json({ timestamp: "2026-11-13T22:55:24Z", event: "Location", StarSystem: "Legacy", Docked: false }),
    ],
    [
      NEWEST,
      () =>
        json({ timestamp: "2026-11-24T12:37:21Z", event: "Location", StarSystem: "Eravine", Docked: true, StationName: "Kestrel Reach" }) +
        json({ timestamp: "2026-11-24T12:37:22Z", event: "Materials", Raw: [], Manufactured: [], Encoded: [] }),
    ],
    ["Status.json", () => "{}"],
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FileSystemJournalSource", () => {
  it("reads the newest journal as soon as it starts", async () => {
    const { sink, sessions, events, latest } = recorder();
    const source = new FileSystemJournalSource(fakeDirectory("Elite Dangerous", files), sink);
    await source.start();
    expect(sessions).toEqual([NEWEST]);
    expect(events.map((event) => event.StarSystem)).toEqual(["Eravine"]);
    expect(latest()).toMatchObject({ state: "live", folderName: "Elite Dangerous", pollIntervalMs: 250 });
    source.stop();
  });

  it("skips events it does not read", async () => {
    const { sink, events } = recorder();
    const source = new FileSystemJournalSource(fakeDirectory("Elite Dangerous", files), sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(events.map((event) => event.event)).toEqual(["Location"]);
    source.stop();
  });

  it("picks up a line that arrives in two writes", async () => {
    const { sink, events } = recorder();
    let content = json({ timestamp: "2026-11-24T12:37:21Z", event: "Location", StarSystem: "Eravine", Docked: false });
    files.set(NEWEST, () => content);
    const source = new FileSystemJournalSource(fakeDirectory("Elite Dangerous", files), sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toHaveLength(1);

    content += '{"timestamp":"2026-11-24T12:40:00Z","event":"Docked","StationNa';
    await vi.advanceTimersByTimeAsync(250);
    expect(events).toHaveLength(1);

    content += 'me":"Kestrel Reach"}\r\n';
    await vi.advanceTimersByTimeAsync(250);
    expect(events.map((event) => event.event)).toEqual(["Location", "Docked"]);
    source.stop();
  });

  it("follows the game into a new session", async () => {
    const { sink, sessions, events, latest } = recorder();
    const source = new FileSystemJournalSource(fakeDirectory("Elite Dangerous", files), sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toHaveLength(1);

    files.set(
      "Journal.2026-11-25T091500.01.log",
      () => json({ timestamp: "2026-11-25T09:15:01Z", event: "Location", StarSystem: "Sol", Docked: false }),
    );
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sessions).toEqual([NEWEST, "Journal.2026-11-25T091500.01.log"]);
    expect(events.map((event) => event.StarSystem)).toEqual(["Eravine", "Sol"]);
    expect(latest()).toMatchObject({ state: "live", fileName: "Journal.2026-11-25T091500.01.log" });
    source.stop();
  });

  it("polls quickly while the game writes and slowly once it is quiet", async () => {
    const { sink, events, latest } = recorder();
    let content = json({ timestamp: "2026-11-24T12:37:21Z", event: "Location", StarSystem: "Eravine", Docked: false });
    files.set(NEWEST, () => content);
    const source = new FileSystemJournalSource(fakeDirectory("Elite Dangerous", files), sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(source["pollInterval"]()).toBe(250);

    // Five quiet minutes: drop to the slow rate.
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1000);
    expect(source["pollInterval"]()).toBe(1000);

    // The commander jumps back in: back to the fast rate as soon as a line arrives.
    content += json({ timestamp: "2026-11-24T12:50:00Z", event: "FSDJump", StarSystem: "Sol", StarPos: [0, 0, 0] });
    await vi.advanceTimersByTimeAsync(1000);
    expect(events.map((event) => event.event)).toEqual(["Location", "FSDJump"]);
    expect(source["pollInterval"]()).toBe(250);
    expect(latest().pollIntervalMs).toBe(250);

    // The end of a session slows polling straight away.
    content += json({ timestamp: "2026-11-24T13:00:00Z", event: "Shutdown" });
    await vi.advanceTimersByTimeAsync(250);
    expect(source["pollInterval"]()).toBe(1000);
    source.stop();
  });

  it("waits patiently when the folder holds no journal yet", async () => {
    const { sink, sessions, events, latest } = recorder();
    const sparse = new Map<string, FileContent>([["Status.json", () => "{}"]]);
    const source = new FileSystemJournalSource(fakeDirectory("Elite Dangerous", sparse), sink);
    await source.start();
    expect(latest()).toMatchObject({ state: "empty", source: "file" });

    sparse.set(
      "Journal.2026-11-25T091500.01.log",
      () => json({ timestamp: "2026-11-25T09:15:01Z", event: "Location", StarSystem: "Sol", Docked: false }),
    );
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sessions).toHaveLength(1);
    expect(events.map((event) => event.StarSystem)).toEqual(["Sol"]);
    expect(latest()).toMatchObject({ state: "live" });
    source.stop();
  });

  it("reads the same file from its start if it was replaced by a shorter one", async () => {
    const { sink, events } = recorder();
    let content = json({ timestamp: "2026-11-24T12:37:21Z", event: "Location", StarSystem: "Eravine", Docked: false });
    files.set(NEWEST, () => content);
    const source = new FileSystemJournalSource(fakeDirectory("Elite Dangerous", files), sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(0);
    content = json({ timestamp: "2026-11-24T12:00:00Z", event: "Location", StarSystem: "Sol", Docked: false });
    await vi.advanceTimersByTimeAsync(250);
    expect(events.map((event) => event.StarSystem)).toEqual(["Eravine", "Sol"]);
    source.stop();
  });

  it("stops with a plain explanation when access is withdrawn", async () => {
    const { sink, events, latest } = recorder();
    let denied = false;
    const directory = {
      name: "Elite Dangerous",
      kind: "directory",
      async *entries() {
        for (const fileName of files.keys()) {
          yield [
            fileName,
            {
              kind: "file",
              name: fileName,
              getFile: async () => {
                if (denied) {
                  throw new DOMException("Permission revoked", "NotAllowedError");
                }
                return new File([json({ timestamp: "2026-11-24T12:37:21Z", event: "Location", StarSystem: "Eravine" })], fileName);
              },
            },
          ];
        }
      },
    } as unknown as ReadableDirectoryHandle;
    const source = new FileSystemJournalSource(directory, sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toHaveLength(1);
    denied = true;
    await vi.advanceTimersByTimeAsync(5000);
    expect(latest()).toMatchObject({
      state: "error",
      error: "Access to the journal folder was withdrawn. Reconnect to keep watching.",
    });
    source.stop();
  });

  it("produces a coherent commander state from a real-shaped session", async () => {
    const { sink, events } = recorder();
    let content = json({
      timestamp: "2026-11-24T12:37:21Z",
      event: "LoadGame",
      Commander: "HRC1",
      FID: "F44396",
      GameMode: "Open",
      Ship: "CobraMkIII",
    });
    content += json({ timestamp: "2026-11-24T12:37:21Z", event: "Loadout", Ship: "panthermkii", ShipName: "Big Load", CargoCapacity: 784, MaxJumpRange: 20.5 });
    content += json({ timestamp: "2026-11-24T12:37:22Z", event: "Location", StarSystem: "Eravine", Docked: false });
    files.set(NEWEST, () => content);
    const source = new FileSystemJournalSource(fakeDirectory("Elite Dangerous", files), sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(0);
    const state = events.reduce((acc, event) => applyJournalEvent(acc, event), INITIAL_COMMANDER_STATE);
    expect(state.commanderName).toBe("HRC1");
    expect(state.ship).toMatchObject({ className: "Panther Clipper Mk II", padSize: "L" });
    expect(describeActivity(state).label).toBe("In flight");
    source.stop();
  });
});
