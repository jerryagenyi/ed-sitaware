// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RawJournalEvent } from "@/lib/journal/fields";
import { applyJournalEvent, describeActivity, INITIAL_COMMANDER_STATE } from "@/lib/journal/state";
import { DEMO_SESSION_NAME, DemoJournalSource } from "./demo-journal-source";
import { DEMO_LINES } from "./demo/sample-journal";
import type { JournalSink } from "./journal-source";

const HOME_SYSTEM = "Col 278 Sector LS-Z b31-2";
const CARRIER = "SQA-7D4";

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
      // Reported by GameModeChange, after LoadGame said Open.
      gameMode: "Solo",
      system: { name: HOME_SYSTEM, population: 0 },
      station: { name: CARRIER, type: "FleetCarrier", distanceFromStarLs: null, pads: null },
      motion: { docked: true },
    });
    expect(describeActivity(fold(events))).toEqual({ label: "Docked", detail: `on ${CARRIER}` });

    await vi.advanceTimersByTimeAsync(14_000);
    expect(describeActivity(fold(events))).toEqual({ label: "Hyperspace", detail: "jumping to Eravine" });

    await vi.advanceTimersByTimeAsync(17_500);
    const docked = fold(events);
    expect(docked.system?.name).toBe("Eravine");
    expect(docked.station).toMatchObject({
      name: "Thornbury Point",
      distanceFromStarLs: 8420,
      pads: { small: 4, medium: 3, large: 0 },
    });
    expect(describeActivity(docked)).toEqual({ label: "Docked", detail: "at Thornbury Point" });

    await vi.advanceTimersByTimeAsync(2_500);
    expect(describeActivity(fold(events))).toEqual({ label: "On foot", detail: "at Thornbury Point" });
    source.stop();
  });

  it("stamps events with the current clock", async () => {
    const { sink, events } = recorder();
    const source = new DemoJournalSource(DEMO_LINES, sink);
    await source.start();
    await vi.advanceTimersByTimeAsync(35_000);
    const stamps = events.map((event) => event.timestamp);
    expect(stamps[0]).toBe("2026-11-27T19:00:00.000Z");
    expect(stamps.at(-1)).toBe("2026-11-27T19:00:33.000Z");
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
  const lineFor = (name: string) => DEMO_LINES.find(({ event }) => event.event === name)?.event;

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

  // These keep the demo honest. They were learnt from real journals, and if someone
  // "improves" the demo into something the game does not write, they fail.
  it("is written the way the game writes a login on a fleet carrier", () => {
    const login = lineFor("Location");
    expect(login).toMatchObject({ Docked: true, StationType: "FleetCarrier", BodyType: "Station" });
    // Not given at a login: the distance from the star, the pads, and any faction.
    expect(login).not.toHaveProperty("DistFromStarLS");
    expect(login).not.toHaveProperty("LandingPads");
    expect(login).not.toHaveProperty("Factions");
    expect(lineFor("CarrierLocation")).toMatchObject({ CarrierType: "FleetCarrier", StarSystem: HOME_SYSTEM });
  });

  it("is written the way the game writes a docking", () => {
    const docked = lineFor("Docked");
    expect(docked).toMatchObject({ StationType: "Outpost", DistFromStarLS: 8420 });
    expect(docked?.LandingPads).toEqual({ Small: 4, Medium: 3, Large: 0 });
  });

  it("reports a change of game mode as its own event", () => {
    expect(lineFor("LoadGame")).toMatchObject({ GameMode: "Open" });
    expect(lineFor("GameModeChange")).toMatchObject({ GameMode: "Solo" });
  });

  it("has a system name long enough that it must wrap", () => {
    expect(HOME_SYSTEM.length).toBeGreaterThanOrEqual(24);
  });
});
