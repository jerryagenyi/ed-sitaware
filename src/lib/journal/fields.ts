/** A parsed journal line. Only the fields this app reads are typed; the rest stay unknown. */
export type RawJournalEvent = { event: string; timestamp?: string } & Record<string, unknown>;

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

/**
 * Read a field that should be a list. The journal writes a list with a single entry
 * as a bare value instead of a one-element array, so accept both.
 */
export function asList(value: unknown): unknown[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function asStringList(value: unknown): string[] {
  return asList(value).filter((item): item is string => typeof item === "string");
}

export function asRecordList(value: unknown): Record<string, unknown>[] {
  return asList(value).filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
  );
}
