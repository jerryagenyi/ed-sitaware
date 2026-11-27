"use client";

import { formatAge } from "@/lib/format";
import { linkStatusOf, useCommanderStore } from "@/store/commander";

/** How closely the dashboard is following the journal. */
export function ConnectionChip({ now }: { now: number }) {
  const connection = useCommanderStore((state) => state.connection);
  const link = linkStatusOf(connection, now);
  const { source, lastReceivedAt, pollIntervalMs, folderName, fileName } = connection;

  const details = [
    folderName && `Folder: ${folderName}`,
    fileName && `File: ${fileName}`,
    pollIntervalMs && `Checked every ${pollIntervalMs} ms`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (source === "demo") {
    return (
      <span className="chip chip--demo" title="Playing a made-up session so you can see the dashboard without the game.">
        Demo
      </span>
    );
  }

  switch (link) {
    case "live":
      return (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted">
          <span className="chip chip--live" title={details}>
            <span className="dot" aria-hidden="true" />
            Live
          </span>
          <span>Last event {formatAge(lastReceivedAt, now)}</span>
        </span>
      );
    case "idle":
      return (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted">
          <span className="chip" title={details}>
            <span className="dot" aria-hidden="true" />
            Idle
          </span>
          <span>Last event {formatAge(lastReceivedAt, now)}</span>
        </span>
      );
    case "connecting":
      return <span className="chip">Connecting</span>;
    case "empty":
      return (
        <span className="chip" title={details}>
          Watching · no journal yet
        </span>
      );
    case "error":
      return <span className="chip chip--danger" title={connection.error ?? undefined}>Disconnected</span>;
    default:
      return <span className="chip">Not connected</span>;
  }
}
