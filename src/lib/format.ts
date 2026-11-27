// Formatting helpers. Every formatter pins en-GB so output does not depend on the
// server's locale; none of them run during server rendering, so hydration is unaffected.

const integer = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

const decimal = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 1,
});

/** Placeholder used wherever a value is not known. */
export const UNKNOWN = "—";

export function formatInt(value: number | null | undefined): string {
  return value === null || value === undefined ? UNKNOWN : integer.format(Math.round(value));
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? UNKNOWN : decimal.format(value);
}

/** "2.3 billion" rather than "2,345,678,901". */
export function formatPopulation(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return UNKNOWN;
  }
  return value > 0 && value < 1000 ? formatInt(value) : compact.format(value);
}

/** Galaxy coordinates as three short signed numbers. */
export function formatPosition(position: readonly [number, number, number] | null): string {
  if (!position) {
    return UNKNOWN;
  }
  return position.map((axis) => decimal.format(axis)).join(" / ");
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Local wall-clock time, e.g. "18:42". */
export function formatClock(
  isoTimestamp: string | null | undefined,
  now: number = Date.now(),
): string {
  const time = isoTimestamp ? Date.parse(isoTimestamp) : Number.NaN;
  const date = Number.isNaN(time) ? null : new Date(time);
  if (!date || date.getTime() > now) {
    return UNKNOWN;
  }
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** "just now", "12 s ago", "4 min ago", "3 h ago", "2 d ago". */
export function formatAge(fromMs: number | null | undefined, nowMs: number): string {
  if (fromMs === null || fromMs === undefined) {
    return UNKNOWN;
  }
  const seconds = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (seconds < 5) {
    return "just now";
  }
  if (seconds < 60) {
    return `${seconds} s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours} h ago`;
  }
  return `${Math.round(hours / 24)} d ago`;
}
