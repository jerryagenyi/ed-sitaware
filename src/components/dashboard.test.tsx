// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CARD_ORDER, moveCard } from "@/lib/card-order";
import type { ReadableDirectoryHandle } from "@/lib/fsa/directory-access";
import { SETTINGS_STORAGE_KEY } from "@/lib/storage-keys";
import { INITIAL_COMMANDER_STATE } from "@/lib/journal/state";
import { INITIAL_CONNECTION, useCommanderStore } from "@/store/commander";
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

const REPO = "https://github.com/jerryagenyi/ed-sitaware";

/** Names from the demo session, which stands in for a real one. */
const HOME_SYSTEM = "Col 278 Sector LS-Z b31-2";
const CARRIER = "SQA-7D4";

/** Makes the browser report what the system asks for: light, or not. */
const systemWantsLight = (light: boolean) =>
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({ matches: light && query.includes("light"), media: query }),
    configurable: true,
    writable: true,
  });

/** The cards on screen, in the order they are drawn. */
const cardsOnScreen = () =>
  [...document.querySelectorAll("[data-card]")].map((card) => card.getAttribute("data-card"));

/** The panel a folder can be dropped on. */
const dropPanel = () =>
  screen.getByRole("region", { name: "Journal connection" }).querySelector(".drop-target") as HTMLElement;

/** A journal folder as the browser would hand one over: no real file system involved. */
const fakeJournalDirectory = () => {
  const name = "Journal.2026-11-24T123720.01.log";
  const text = `${JSON.stringify({
    timestamp: "2026-11-24T12:37:21Z",
    event: "Location",
    StarSystem: "Eravine",
    Docked: false,
  })}
`;
  const bytes = new TextEncoder().encode(text);
  return {
    name: "Elite Dangerous",
    kind: "directory",
    async *entries() {
      yield [
        name,
        {
          kind: "file",
          name,
          getFile: async () => ({
            size: bytes.length,
            slice: (start: number, end: number) => ({
              arrayBuffer: async () => bytes.slice(start, end).buffer,
            }),
          }),
        },
      ];
    },
  } as unknown as ReadableDirectoryHandle;
};

// The connect screen shows the journal path for the system the browser reports. jsdom
// reports whatever machine the tests run on, so the tests say which one they mean.
const WINDOWS_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130";
const LINUX_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130";
const agentOnThisMachine = navigator.userAgent;

const reportSystem = (userAgent: string) =>
  Object.defineProperty(navigator, "userAgent", { value: userAgent, configurable: true });

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
  reportSystem(WINDOWS_USER_AGENT);
  localStorage.clear();
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  useCommanderStore.setState({ commander: INITIAL_COMMANDER_STATE, connection: INITIAL_CONNECTION });
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  delete (window as PickerWindow).showDirectoryPicker;
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(window, "matchMedia");
  reportSystem(agentOnThisMachine);
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

    // The folder is the one thing players cannot find. Say where it is, and make the path copyable.
    expect(screen.getByRole("heading", { name: "Where is that folder?" })).toBeInTheDocument();
    expect(screen.getByText(/Not where the game is installed/)).toBeInTheDocument();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "Copy path" }));
    await elapse(0);
    expect(writeText).toHaveBeenCalledWith(
      String.raw`%USERPROFILE%\Saved Games\Frontier Developments\Elite Dangerous`,
    );
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByText("Path copied to the clipboard.")).toBeInTheDocument();
    // ...and the confirmation does not linger.
    await elapse(3000);
    expect(screen.getByRole("button", { name: "Copy path" })).toBeInTheDocument();
  });

  it("shows the Proton path to a player on Linux", async () => {
    reportSystem(LINUX_USER_AGENT);
    (window as PickerWindow).showDirectoryPicker = vi.fn();
    render(<Dashboard />);
    await elapse(500);

    expect(screen.getByText(/it is inside the game's Proton prefix/)).toBeInTheDocument();
    expect(screen.getByText(/compatdata.359320/)).toBeInTheDocument();
    // The Windows path is still one step away, folded away.
    expect(screen.getByText("On Windows")).toBeInTheDocument();
  });

  it("says so when the path cannot be copied for the player", async () => {
    (window as PickerWindow).showDirectoryPicker = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("not allowed")) },
      configurable: true,
    });
    render(<Dashboard />);
    await elapse(500);

    fireEvent.click(screen.getByRole("button", { name: "Copy path" }));
    await elapse(0);

    expect(screen.getByRole("button", { name: "Copy path" })).toBeInTheDocument();
    expect(screen.getByText(/Select it above and copy it yourself/)).toBeInTheDocument();
  });

  it("connects when the journal folder is dropped on the panel", async () => {
    (window as PickerWindow).showDirectoryPicker = vi.fn();
    render(<Dashboard />);
    await elapse(500);
    const panel = dropPanel();

    fireEvent.dragEnter(panel, { dataTransfer: { types: ["Files"] } });
    expect(panel).toHaveAttribute("data-dragging", "true");
    fireEvent.dragLeave(panel);
    expect(panel).toHaveAttribute("data-dragging", "false");

    fireEvent.drop(panel, {
      dataTransfer: { items: [{ kind: "file", getAsFileSystemHandle: async () => fakeJournalDirectory() }] },
    });
    await elapse(1000);

    expect(screen.getByRole("heading", { level: 2, name: "Eravine" })).toBeInTheDocument();
    expect(screen.getAllByText(/Last event/).length).toBeGreaterThan(0);
  });

  it("explains when a single file is dropped instead of the folder", async () => {
    (window as PickerWindow).showDirectoryPicker = vi.fn();
    render(<Dashboard />);
    await elapse(500);

    fireEvent.drop(dropPanel(), {
      dataTransfer: {
        items: [{ kind: "file", getAsFileSystemHandle: async () => ({ kind: "file", name: "Journal.log" }) }],
      },
    });
    await elapse(100);

    expect(screen.getByText(/Drop the whole Elite Dangerous folder instead/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Connect your journal" })).toBeInTheDocument();
  });

  it("switches between light and dark with the sun and moon button", async () => {
    await startDemo();
    expect(document.documentElement.dataset.theme).toBe("amber");

    fireEvent.click(screen.getByRole("button", { name: "Dark mode. Switch to light mode" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    // Light mode is one look of its own: the dark colours step aside while it is on.
    expect(screen.queryByRole("radio", { name: "Amber" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light mode. Switch to dark mode" })).toBeInTheDocument();

    // Back to dark: the colour last used is the one that comes back.
    fireEvent.click(screen.getByRole("button", { name: "Light mode. Switch to dark mode" }));
    expect(document.documentElement.dataset.theme).toBe("amber");
    fireEvent.click(screen.getByRole("radio", { name: "Cyan" }));
    expect(document.documentElement.dataset.theme).toBe("cyan");
    fireEvent.click(screen.getByRole("button", { name: "Dark mode. Switch to light mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Light mode. Switch to dark mode" }));
    expect(document.documentElement.dataset.theme).toBe("cyan");
  });

  it("follows the system's light or dark setting on a first visit", async () => {
    systemWantsLight(true);
    render(<Dashboard />);
    await elapse(500);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("button", { name: "Light mode. Switch to dark mode" })).toBeInTheDocument();
  });

  it("keeps following the system on later visits, until the player chooses", async () => {
    systemWantsLight(false);
    // Stored on an earlier visit when the system wanted light, and the player chose nothing.
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { ...DEFAULT_SETTINGS, theme: "light" }, version: 1 }),
    );
    render(<Dashboard />);
    await elapse(500);

    expect(document.documentElement.dataset.theme).toBe("amber");
  });

  it("keeps the theme the player chose, whatever the system says", async () => {
    systemWantsLight(true);
    // Chosen in a build that did not record choices yet, so the stored settings carry no flag.
    const olderSettings = { ...DEFAULT_SETTINGS, themeChosen: undefined };
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { ...olderSettings, theme: "cyan", darkColour: "cyan" }, version: 1 }),
    );
    render(<Dashboard />);
    await elapse(500);

    expect(document.documentElement.dataset.theme).toBe("cyan");
    expect(screen.getByRole("radio", { name: "Cyan" })).toBeChecked();
  });

  it("keeps a theme chosen in this build, whatever the system says", async () => {
    systemWantsLight(true);
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        state: { ...DEFAULT_SETTINGS, theme: "slate", darkColour: "slate", themeChosen: true },
        version: 1,
      }),
    );
    render(<Dashboard />);
    await elapse(500);

    expect(document.documentElement.dataset.theme).toBe("slate");
  });

  it("asks before disconnecting, and offers the same folder afterwards", async () => {
    (window as PickerWindow).showDirectoryPicker = vi.fn();
    render(<Dashboard />);
    await elapse(500);
    fireEvent.drop(dropPanel(), {
      dataTransfer: { items: [{ kind: "file", getAsFileSystemHandle: async () => fakeJournalDirectory() }] },
    });
    await elapse(1000);
    expect(screen.getByRole("heading", { level: 2, name: "Eravine" })).toBeInTheDocument();

    const askToDisconnect = () =>
      fireEvent.click(screen.getByRole("button", { name: "Disconnect from the journal" }));
    const question = () => screen.getByRole("dialog", { name: "Disconnect from your journal?" });

    askToDisconnect();
    expect(question()).toHaveAttribute("open");
    expect(question()).toHaveTextContent(/Your folder is remembered/);

    // Stepping back changes nothing.
    fireEvent.click(within(question()).getByRole("button", { name: "Keep watching" }));
    await elapse(100);
    // A closed dialog is hidden from assistive technology, so ask the element itself.
    expect(document.querySelector("dialog.confirm")).not.toHaveAttribute("open");
    expect(screen.getByRole("heading", { level: 2, name: "Eravine" })).toBeInTheDocument();

    // Meaning it stops following the game, and remembers where to pick up again.
    askToDisconnect();
    fireEvent.click(within(question()).getByRole("button", { name: "Disconnect" }));
    await elapse(100);
    expect(screen.queryByRole("heading", { level: 2, name: "Eravine" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome back, Commander" })).toBeInTheDocument();
    expect(screen.getByText(/Reconnect to “Elite Dangerous”/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeInTheDocument();
  });

  it("offers a reset that says what it resets once a preset has been changed", async () => {
    const resetName = "Reset General / Bubble runner to its defaults";
    await startDemo();
    expect(screen.queryByRole("button", { name: resetName })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("slider", { name: "Search radius" }), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: resetName }));

    expect(screen.getAllByText("25 ly").length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole("button", { name: resetName })).not.toBeInTheDocument();
  });

  it("says a system is uninhabited instead of showing a card of dashes", async () => {
    await startDemo();
    // The demo starts in a system where nobody lives.
    expect(screen.getByText(/Uninhabited\. No one lives here/)).toBeInTheDocument();
    expect(screen.getByText("Uninhabited")).toBeInTheDocument();
    expect(within(card("Current system")).queryByText("Controlling faction")).not.toBeInTheDocument();
  });

  it("lets a card fold up and open again", async () => {
    await startDemo();
    const hide = screen.getByRole("button", { name: "Hide current system" });
    const body = document.getElementById(hide.getAttribute("aria-controls") ?? "");
    expect(hide).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(hide);
    const show = screen.getByRole("button", { name: "Show current system" });
    expect(show).toHaveAttribute("aria-expanded", "false");
    // Folded away on phones; this class is what hides it there.
    expect(body).toHaveClass("hidden");

    fireEvent.click(show);
    expect(body).not.toHaveClass("hidden");
  });

  it("draws the cards in the player's order, and offers the way back once they have moved", async () => {
    const resetOrderName = "Put the cards back in their starting order";
    await startDemo();
    expect(cardsOnScreen()).toEqual([
      "system",
      "station",
      "hazard_alerts",
      "nearest_ports",
      "material_traders",
      "interstellar_factors",
    ]);

    useSettingsStore.setState({ cardOrder: moveCard(DEFAULT_CARD_ORDER, "system", "combat_zones") });
    await elapse(100);
    expect(cardsOnScreen().at(-1)).toBe("system");

    fireEvent.click(screen.getByRole("button", { name: "Customise briefing" }));
    const drawer = screen.getByRole("dialog", { name: "Customise briefing" });
    fireEvent.click(within(drawer).getByRole("button", { name: resetOrderName }));

    expect(useSettingsStore.getState().cardOrder).toEqual([...DEFAULT_CARD_ORDER]);
    expect(cardsOnScreen()[0]).toBe("system");
    expect(within(drawer).queryByRole("button", { name: resetOrderName })).not.toBeInTheDocument();
  });

  it("closes every screen with copyright, licence and the way back to the project", async () => {
    render(<Dashboard />);
    await elapse(500);
    const footer = screen.getByRole("contentinfo");

    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} Jerry Agenyi`);
    expect(footer).toHaveTextContent("not affiliated with Frontier Developments");
    expect(footer).toHaveTextContent("there is no account");
    const nav = within(footer).getByRole("navigation", { name: "Project" });
    for (const [label, href] of [
      ["GitHub", REPO],
      ["Contribute", `${REPO}/blob/main/CONTRIBUTING.md`],
      ["Report a bug", `${REPO}/issues`],
      ["Roadmap", `${REPO}/blob/main/TODO.md`],
      ["References", `${REPO}/blob/main/REFERENCES.md`],
      ["MIT licence", `${REPO}/blob/main/LICENSE`],
    ] as const) {
      expect(within(footer).getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
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

  it("says so when the browser has a folder picker that cannot open", async () => {
    (window as PickerWindow).showDirectoryPicker = vi
      .fn()
      .mockRejectedValue(new Error("not implemented here"));
    render(<Dashboard />);
    await elapse(500);
    fireEvent.click(screen.getByRole("button", { name: /Choose journal folder/ }));
    await elapse(100);

    expect(
      screen.getByRole("heading", { name: "This browser cannot read local folders" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Watch a demo session/ })).toBeInTheDocument();
  });

  it("follows the demo session from a docked start to a docked finish", async () => {
    await startDemo();

    expect(screen.getByRole("heading", { level: 2, name: HOME_SYSTEM })).toBeInTheDocument();
    expect(screen.getAllByText(`Docked · on ${CARRIER}`).length).toBeGreaterThan(0);
    // Sitting on a carrier is not being at a station, and at a login the journal
    // gives neither the distance from the star nor the pads.
    expect(screen.getByRole("heading", { name: "Current carrier" })).toBeInTheDocument();
    expect(screen.getAllByText("Given when you dock").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/or the carrier you are on/)).toBeInTheDocument();
    expect(screen.getByText("Second Screen · Cobra Mk III")).toBeInTheDocument();
    // Once in the telemetry strip and once in each widget that filters by pad.
    expect(screen.getAllByText("Auto · S pad").length).toBeGreaterThanOrEqual(2);

    await elapse(14_500);
    expect(screen.getByRole("heading", { level: 2, name: HOME_SYSTEM })).toBeInTheDocument();
    expect(screen.getAllByText(/Hyperspace · jumping to Eravine/).length).toBeGreaterThan(0);

    await elapse(16_500);
    expect(screen.getByRole("heading", { level: 2, name: "Eravine" })).toBeInTheDocument();
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
    expect(within(drawer).getByText(/You have changed this preset/)).toBeInTheDocument();

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
