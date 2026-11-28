"use client";

import { Moon, SlidersHorizontal, Sun, Unplug, X } from "lucide-react";
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { DARK_COLOURS } from "@/lib/theme";
import { journal } from "@/sources/journal-controller";
import { useCommanderStore } from "@/store/commander";
import { useTheme } from "@/store/settings";
import { Button, Segmented } from "@/components/controls";
import { ConnectionChip } from "@/components/connection-chip";

const subscribeToNothing = () => () => undefined;

/** What the server draws before anyone's settings are known. */
const SERVER_THEME = "amber" as const;

/**
 * A sun and moon button for light and dark, and the three cockpit colours for dark
 * mode. Light mode is one look of its own, so the colours step aside while it is on.
 */
function ThemeSwitch() {
  const { theme, darkColour, themeChosen, chooseTheme, toggleLightDark, followSystemTheme } = useTheme();
  // False while the server's markup is being hydrated, true after.
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  // The theme is applied before paint by a script in the document head. Re-apply it
  // here too, because React's development remount resets attributes on <html>.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Someone who has not chosen a theme keeps following the system, even as it changes under them.
  useEffect(() => {
    if (themeChosen || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const follow = () => followSystemTheme();
    query.addEventListener?.("change", follow);
    return () => query.removeEventListener?.("change", follow);
  }, [themeChosen, followSystemTheme]);

  // Until hydration is over, draw what the server drew. React corrects it before the first paint.
  const current = mounted ? theme : SERVER_THEME;
  const light = current === "light";
  const toggleLabel = light ? "Light mode. Switch to dark mode" : "Dark mode. Switch to light mode";

  return (
    <div className="flex items-center gap-2">
      {!light && (
        <Segmented
          label="Colour"
          hideLabel
          options={DARK_COLOURS.map(({ value, label }) => ({ value, label }))}
          value={mounted ? darkColour : SERVER_THEME}
          onChange={chooseTheme}
        />
      )}
      <Button icon aria-label={toggleLabel} title={toggleLabel} onClick={toggleLightDark}>
        {light ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </Button>
    </div>
  );
}

/** A targeting reticle: the one mark the brief is known by. */
function Reticle() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5 flex-none text-accent"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 1v4.5M10 14.5V19M1 10h4.5M14.5 10H19" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface TopBarProps {
  now: number;
  onCustomise: () => void;
  /** Called when the player asks to stop following their journal. The caller checks they mean it. */
  onDisconnect: () => void;
}

export function TopBar({ now, onCustomise, onDisconnect }: TopBarProps) {
  const connection = useCommanderStore((state) => state.connection);
  const following = connection.state === "live" || connection.state === "error";
  const demo = connection.source === "demo";

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bg/90 px-6 py-3 backdrop-blur">
      <h1 className="flex items-center gap-2 text-small font-semibold tracking-[0.14em] uppercase">
        <Reticle />
        ED:SitAware
      </h1>
      <ConnectionChip now={now} />
      <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <ThemeSwitch />
        <Button onClick={onCustomise} aria-haspopup="dialog" aria-label="Customise briefing">
          <SlidersHorizontal aria-hidden="true" />
          <span className="hidden sm:inline" aria-hidden="true">
            Customise
          </span>
        </Button>
        {following && (
          // Leaving the demo loses nothing. Disconnecting from a journal is worth a second look.
          <Button
            icon
            aria-label={demo ? "Exit the demo" : "Disconnect from the journal"}
            title={demo ? "Exit the demo" : "Disconnect"}
            onClick={demo ? () => journal.disconnect() : onDisconnect}
          >
            {demo ? <X aria-hidden="true" /> : <Unplug aria-hidden="true" />}
          </Button>
        )}
      </div>
    </header>
  );
}
