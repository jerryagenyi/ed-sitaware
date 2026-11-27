"use client";

import { SlidersHorizontal, Unplug, X } from "lucide-react";
import { useLayoutEffect } from "react";
import { THEMES, useTheme } from "@/store/settings";
import { journal } from "@/sources/journal-controller";
import { useCommanderStore } from "@/store/commander";
import { Button, Segmented } from "@/components/controls";
import { ConnectionChip } from "@/components/connection-chip";

function ThemeSwitch() {
  const [theme, setTheme] = useTheme();
  // The theme is applied before paint by a script in the document head. Re-apply it
  // here too, because React's development remount resets attributes on <html>.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <Segmented
      label="Theme"
      hideLabel
      options={THEMES.map(({ id, label }) => ({ value: id, label }))}
      value={theme}
      onChange={setTheme}
    />
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
}

export function TopBar({ now, onCustomise }: TopBarProps) {
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
          <Button
            icon
            aria-label={demo ? "Exit the demo" : "Disconnect from the journal"}
            title={demo ? "Exit the demo" : "Disconnect"}
            onClick={() => journal.disconnect()}
          >
            {demo ? <X aria-hidden="true" /> : <Unplug aria-hidden="true" />}
          </Button>
        )}
      </div>
    </header>
  );
}
