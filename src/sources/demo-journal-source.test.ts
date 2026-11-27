// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RawJournalEvent } from "@/lib/journal/fields";
import { applyJournalEvent, describeActivity, INITIAL_COMMANDER_STATE } from "@/lib/journal/state";
import { DEMO_SESSION_NAME, DemoJournalSource } from "./demo-journal-source";
import { DEMO_LINES } from "./demo/sample-journal";
import type { JournalSink } from "./journal-source";

const fold = (events: RawJournalEvent[]) =>
  events.reduce((state, event) => applyJournalEvent(state, event), INITIAL_COMMANDER_STATE);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-27T19:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function recorder() {
  const events: RawJournalEvent[] = [];
  const sessions: string[] = [];
  const sink: JournalSink = {
    onSession: (session) => sessions.push(session.fileName),
    onEvents: (batch) => events.push(...batch),
    onStatus: () => undefined,
  };
  return { sink, events, sessions };
}

describe("DemoJournalSource", () => {
  it("shows the starting situation at once and then plays the session out", async () => {
    const { sink, events, sessions } = recorder();
    const source = new DemoJournalSource(DEMO_LINES, sink);
    await source.start();
    expect(sessions).toEqual([DEMO_SESSION_NAME]);
    expect(fold(events)).toMatchObject({
      commanderName: "SitAware Demo",
      system: { name: "Eravine" },
      station: { name: "Kestrel Reach" },
      motion: { docked: true },
    });

    await vi.advanceTimersByTimeAsync(13_000);
    expect(describeActivity(fold(events))).toEqual({ label: "Hyperspace", detail: "jumping to Voss 214" });

    await vi.advanceTimersByTimeAsync(20_000);
    const final = fold(events);
    expect(final.system?.name).toBe("Voss 214");
    expect(final.station).toMatchObject({ name: "Thornbury Point", distanceFromStarLs: 8420 });
    expect(describeActivity(final)).toEqual({ label: "Docked", detail: "at Thornbury Point" });
    source.stop();
  });

  it("stamps events with the current clock", async () => {
    const { sink, events } = recorder();
    const source = new DemoJournalSource(DEMO_LINES, sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(30_000);
    const stamps = events.map((event) => event.timestamp);
    expect(stamps[0]).toBe("2026-11-27T19:00:00.000Z");
    expect(stamps.at(-1)).toBe("2026-11-27T19:00:30.000Z");
    source.stop();
  });

  it("stops cleanly and sends nothing more", async () => {
    const { sink, events } = recorder();
    const source = new DemoJournalSource(DEMO_LINES, sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(5000);
    const atStop = events.length;
    source.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(events).toHaveLength(atStop);
  });
});

describe("the sample journal", () => {
  it("exercises the gotchas it was written to show", () => {
    const state = fold(DEMO_LINES.map((line) => line.event));
    expect(state.ship).toMatchObject({ className: "Cobra Mk III", padSize: "S", name: "Second Screen" });
    expect(state.station?.pads).toEqual({ small: 4, medium: 3, large: 0 });
    expect(state.system?.controllingFaction).toMatchObject({ name: "Voss Free Union", state: "Lockdown" });
    expect(state.system?.security).toBe("Anarchy");
    expect(state.cargo?.carried).toBe(6);
  });

  it("is scheduled in order and every line carries a timestamp", () => {
    const times = DEMO_LINES.map((line) => line.atMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[0]).toBe(0);
    expect(DEMO_LINES.every((line) => typeof line.event.timestamp === "string")).toBe(true);
  });
});
