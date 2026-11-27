"use client";

import { useEffect, useState } from "react";

/**
 * The current time, refreshed on an interval. Pass null to stop the clock.
 * The value is never rendered on the server, so starting it at "now" is safe.
 */
export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (intervalMs === null) {
      return;
    }
    // Tick at once so a clock that was stopped is not stale, then keep going.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
