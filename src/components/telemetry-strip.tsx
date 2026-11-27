"use client";

import type { ReactNode } from "react";
import { formatInt, formatNumber, UNKNOWN } from "@/lib/format";
import { describeActivity } from "@/lib/journal/state";
import { PAD_FILTERS, minimumPadSize } from "@/lib/profiles";
import { useCommanderStore } from "@/store/commander";
import { useEffectiveProfile } from "@/store/settings";
import { Facts } from "@/components/hud-panel";
import { Flash } from "@/components/flash";

export function TelemetryStrip({ now }: { now: number }) {
  const commander = useCommanderStore((state) => state.commander);
  const profile = useEffectiveProfile();
  const { system, ship, cargo, commanderName, gameMode, client } = commander;

  const activity = describeActivity(commander, now);
  const activityText = activity.detail ? `${activity.label} · ${activity.detail}` : activity.label;
  const systemName = system?.name ?? UNKNOWN;

  const minimumPad = minimumPadSize(profile.padFilter, ship?.padSize ?? null);
  let padText: string = "Auto";
  if (profile.padFilter !== "auto") {
    padText = PAD_FILTERS.find((filter) => filter.id === profile.padFilter)?.label ?? "Auto";
  } else if (minimumPad) {
    padText = `Auto · ${minimumPad} pad`;
  }

  const cargoPercent =
    cargo && cargo.capacity && cargo.carried !== null
      ? Math.min(100, Math.round((cargo.carried / cargo.capacity) * 100))
      : 0;

  const shipText: ReactNode = ship ? (
    <>
      {ship.name && `${ship.name} · `}
      {ship.className}
      {!ship.known && (
        <>
          {" "}
          <span className="badge badge--warn" title="This ship is not in the pad table yet, so ports are filtered for a large pad.">
            Unmapped ship
          </span>
        </>
      )}
    </>
  ) : (
    UNKNOWN
  );

  return (
    <section className="border-b border-line px-6 py-6" aria-label="Where you are">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-end">
        <div className="min-w-0">
          <p className="hud-label">System</p>
          <h2 className="mt-1 text-display font-semibold tracking-tight break-words" title={systemName}>
            <Flash changeKey={systemName}>{systemName}</Flash>
          </h2>
          <p className="mt-1 text-body text-muted">
            <Flash changeKey={activityText}>{activityText}</Flash>
          </p>
        </div>
        <Facts
          columns={3}
          items={[
            {
              label: "Commander",
              value: (
                <>
                  {commanderName ?? UNKNOWN}
                  {client.gameVersion && <span className="badge ml-1">v{client.gameVersion}</span>}
                </>
              ),
            },
            { label: "Ship", value: <div className="flex flex-wrap items-center gap-1">{shipText}</div> },
            { label: "Landing pad", value: padText },
            {
              label: "Jump range",
              value: ship?.maxJumpRange != null ? `${formatNumber(ship.maxJumpRange)} ly` : UNKNOWN,
            },
            {
              label: "Cargo",
              value: cargo ? (
                <span className="meter">
                  <span className="meter__bar" aria-hidden="true">
                    <span className="meter__fill" style={{ width: `${cargoPercent}%` }} />
                  </span>
                  <span>
                    <span className="hud-value">{formatInt(cargo.carried)}</span>
                    {cargo.capacity != null && (
                      <span className="text-muted">
                        {" "}
                        / <span className="hud-value">{formatInt(cargo.capacity)}</span>
                      </span>
                    )}{" "}
                    t
                  </span>
                </span>
              ) : (
                UNKNOWN
              ),
            },
            { label: "Game mode", value: gameMode ?? UNKNOWN },
          ]}
        />
      </div>
      {/* Says out loud what the commander is doing whenever that changes. */}
      <p className="sr-only" role="status">
        {activityText}
      </p>
    </section>
  );
}
