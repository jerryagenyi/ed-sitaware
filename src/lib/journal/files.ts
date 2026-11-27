export interface JournalFileName {
  /** Full file name, e.g. `Journal.2026-11-24T123720.01.log`. */
  name: string;
  /** Session start time encoded in the name, as a value that sorts chronologically. */
  startedAt: number;
  /** 1-based sequence for sessions that roll over into several files. */
  part: number;
}

// Journal.2026-11-24T123720.01.log — every current client.
const ISO_NAME = /^Journal\.(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{2})\.log$/;
// Journal.261113225523.01.log — the legacy (3.8) client still writes this form.
const COMPACT_NAME = /^Journal\.(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.(\d{2})\.log$/;

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function build(
  name: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  part: number,
): JournalFileName | null {
  const valid =
    inRange(month, 1, 12) &&
    inRange(day, 1, 31) &&
    inRange(hour, 0, 23) &&
    inRange(minute, 0, 59) &&
    inRange(second, 0, 59) &&
    inRange(part, 1, 99);
  if (!valid) {
    return null;
  }
  return {
    name,
    // Local time read as UTC: only ever compared with other journal names.
    startedAt: Date.UTC(year, month - 1, day, hour, minute, second),
    part,
  };
}

/** Parse a journal file name. Returns null for anything that is not a journal. */
export function parseJournalFileName(name: string): JournalFileName | null {
  const iso = ISO_NAME.exec(name);
  if (iso) {
    const [year, month, day, hour, minute, second, part] = iso.slice(1).map(Number);
    return build(name, year, month, day, hour, minute, second, part);
  }
  const compact = COMPACT_NAME.exec(name);
  if (compact) {
    const [year, month, day, hour, minute, second, part] = compact.slice(1).map(Number);
    return build(name, 2000 + year, month, day, hour, minute, second, part);
  }
  return null;
}

/** Oldest first; a later part of the same session counts as newer. */
export function compareJournalFileNames(a: JournalFileName, b: JournalFileName): number {
  return a.startedAt - b.startedAt || a.part - b.part;
}

export interface NewestJournal<T> {
  file: T;
  parsed: JournalFileName;
}

/**
 * Pick the session to read. Sorting by name alone gets this wrong: a legacy client's
 * `Journal.261113….log` sorts after every `Journal.2026-…` name.
 */
export function newestJournal<T extends { name: string }>(files: readonly T[]): NewestJournal<T> | null {
  let newest: NewestJournal<T> | null = null;
  for (const file of files) {
    const parsed = parseJournalFileName(file.name);
    if (parsed && (!newest || compareJournalFileNames(parsed, newest.parsed) > 0)) {
      newest = { file, parsed };
    }
  }
  return newest;
}
