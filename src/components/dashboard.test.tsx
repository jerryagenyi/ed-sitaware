// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_COMMANDER_STATE } from "@/lib/journal/state";
import { useCommanderStore } from "@/store/commander";
import { DEFAULT_SETTINGS, useSettingsStore } from "@/store/settings";
import { Dashboard } from "./dashboard";

type PickerWindow = Window & { showDirectoryPicker?: unknown };

/** Advance the clock, with every timer and promise that fires inside it. */
const elapse = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

/*
 * Interactions use `fireEvent`: it is synchronous, so it does not wait on timers that
 * a paused fake clock would never fire.
 */
const startDemo = async () => {
  window.history.replaceState(null, "", "/?demo=1");
  render(<Dashboard />);
  await elapse(500);
};

const card = (title: string) =>
  screen.getByRole("heading", { name: title }).closest("section") as HTMLElement;

beforeAll(() => {
  // jsdom has no modal dialog behaviour of its own.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  useCommanderStore.setState({ commander: INITIAL_COMMANDER_STATE });
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  delete (window as PickerWindow).showDirectoryPicker;
  vi.useRealTimers();
});

describe("Dashboard", () => {
  it("explains how to connect when nothing is connected", async () => {
    (window as PickerWindow).showDirectoryPicker = vi.fn();
    render(<Dashboard />);
    await elapse(500);

    expect(screen.getByRole("heading", { name: "Connect your journal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Choose journal folder/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Watch a demo session/ })).toBeInTheDocument();
    expect(screen.getByText(/There is no account/)).toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: "Search radius" })).not.toBeInTheDocument();
  });

  it("says plainly when the browser cannot read local folders", async () => {
    render(<Dashboard />);
    await elapse(500);

    expect(
      screen.getByRole("heading", { name: "This browser cannot read local folders" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Choose journal folder/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Watch a demo session/ })).toBeInTheDocument();
  });

  it("follows the demo session from a docked start to a docked finish", async () => {
    await startDemo();

    expect(screen.getByRole("heading", { level: 2, name: "Eravine" })).toBeInTheDocument();
    expect(screen.getAllByText("Docked · at Kestrel Reach").length).toBeGreaterThan(0);
    expect(screen.getByText("Second Screen · Cobra Mk III")).toBeInTheDocument();
    // Once in the telemetry strip and once in each widget that filters by pad.
    expect(screen.getAllByText("Auto · S pad").length).toBeGreaterThanOrEqual(2);

    await elapse(14_500);
    expect(screen.getByRole("heading", { level: 2, name: "Eravine" })).toBeInTheDocument();
    expect(screen.getAllByText(/Hyperspace · jumping to Voss 214/).length).toBeGreaterThan(0);

    await elapse(16_500);
    expect(screen.getByRole("heading", { level: 2, name: "Voss 214" })).toBeInTheDocument();
    expect(screen.getAllByText("Docked · at Thornbury Point").length).toBeGreaterThan(0);

    const alerts = within(card("Gotcha alerts"));
    // The same faction is in Lockdown at the station and in the system: said once.
    expect(alerts.getAllByText("Lockdown")).toHaveLength(1);
    expect(alerts.getByText("Long supercruise")).toBeInTheDocument();
    expect(alerts.getByText("1 faction in civil war")).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });

  it("switches widgets on and off, and pins them, from the drawer", async () => {
    await startDemo();
    expect(screen.queryByRole("heading", { name: "Tech brokers" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Customise briefing" }));
    const drawer = screen.getByRole("dialog", { name: "Customise briefing" });
    expect(drawer).toHaveAttribute("open");

    const techBrokers = within(drawer).getByRole("checkbox", { name: /Tech brokers/ });
    expect(techBrokers).not.toBeChecked();
    fireEvent.click(techBrokers);
    expect(screen.getByRole("heading", { name: "Tech brokers" })).toBeInTheDocument();
    expect(within(drawer).getByText("Tweaked")).toBeInTheDocument();

    // A pin keeps a widget on whichever profile is active, even one that switches it off.
    fireEvent.click(within(drawer).getByRole("button", { name: "Pin HazRES & conflict zones on every profile" }));
    expect(
      within(drawer).getByRole("button", { name: "Unpin HazRES & conflict zones on every profile" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "HazRES & conflict zones" })).toBeInTheDocument();

    // Switching a pinned widget off drops the pin as well, or it could not go off.
    fireEvent.click(within(drawer).getByRole("checkbox", { name: /HazRES & conflict zones/ }));
    expect(screen.queryByRole("heading", { name: "HazRES & conflict zones" })).not.toBeInTheDocument();
    expect(
      within(drawer).getByRole("button", { name: "Pin HazRES & conflict zones on every profile" }),
    ).toHaveAttribute("aria-pressed", "false");

    // The browser fires `close` on a dialog when it is dismissed; jsdom does not.
    act(() => drawer.dispatchEvent(new Event("close")));
    await elapse(100);
    expect(drawer).not.toHaveAttribute("open");
  });

  it("changes the filters every widget shares from the control bar", async () => {
    await startDemo();

    fireEvent.change(screen.getByRole("slider", { name: "Search radius" }), { target: { value: "60" } });
    // Once in the control bar and once in every widget that searches by radius.
    expect(screen.getAllByText("60 ly").length).toBeGreaterThanOrEqual(3);

    // The limit is a step index: 5,000 Ls by default, 10,000 Ls one step up.
    fireEvent.change(screen.getByRole("slider", { name: "Supercruise limit" }), {
      target: { value: "4" },
    });
    expect(screen.getAllByText("Up to 10,000 Ls").length).toBeGreaterThanOrEqual(2);
    await elapse(31_000);
    // The 8,420 Ls approach is now inside the limit, so it is not flagged.
    expect(screen.queryByText("Long supercruise")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Exclude fleet carriers" }));
    expect(screen.getByText("Included")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "L" }));
    expect(screen.getAllByText("Large only").length).toBeGreaterThanOrEqual(2);
  });

  it("remembers the profile and theme between visits", async () => {
    await startDemo();
    fireEvent.click(screen.getByRole("radio", { name: "Cyan" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Profile" }), { target: { value: "preset_miner" } });
    expect(document.documentElement.dataset.theme).toBe("cyan");
    expect(screen.getByRole("heading", { name: "Mining rings & reserves" })).toBeInTheDocument();
    cleanup();

    render(<Dashboard />);
    await elapse(500);
    expect(screen.getByRole("combobox", { name: "Profile" })).toHaveValue("preset_miner");
    expect(screen.getByRole("radio", { name: "Cyan" })).toBeChecked();
    expect(screen.getByRole("heading", { name: "Mining rings & reserves" })).toBeInTheDocument();
  });
});
