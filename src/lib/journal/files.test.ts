// @vitest-environment node
import { describe, expect, it } from "vitest";
import { newestJournal, parseJournalFileName } from "./files";

describe("parseJournalFileName", () => {
  it("reads the current file name format", () => {
    expect(parseJournalFileName("Journal.2026-11-24T123720.01.log")).toMatchObject({
      part: 1,
      startedAt: Date.UTC(2026, 10, 24, 12, 37, 20),
    });
  });

  it("reads the legacy compact format (YYMMDDhhmmss)", () => {
    expect(parseJournalFileName("Journal.261113225523.01.log")).toMatchObject({
      part: 1,
      startedAt: Date.UTC(2026, 10, 13, 22, 55, 23),
    });
  });

  it("ignores everything that is not a journal", () => {
    for (const name of [
      "Status.json",
      "Market.json",
      "Journal.2026-11-24T123720.01.log.bak",
      "Journal.2026-13-40T123720.01.log",
      "Journal.2026-11-24T123720.00.log",
    ]) {
      expect(parseJournalFileName(name)).toBeNull();
    }
  });
});

describe("newestJournal", () => {
  it("picks the latest session when an old-format name sorts after every other", () => {
    const files = [
      { name: "Journal.2026-11-24T105528.01.log" },
      { name: "Journal.261113225523.01.log" },
      { name: "Journal.2026-11-24T123720.01.log" },
    ];
    expect(newestJournal(files)?.file.name).toBe("Journal.2026-11-24T123720.01.log");
  });

  it("still finds a legacy session when it is the newest", () => {
    const files = [{ name: "Journal.2020-01-01T000000.01.log" }, { name: "Journal.261113225523.01.log" }];
    expect(newestJournal(files)?.file.name).toBe("Journal.261113225523.01.log");
  });

  it("prefers the later part of the same session", () => {
    const files = [
      { name: "Journal.2026-11-24T123720.02.log" },
      { name: "Journal.2026-11-24T123720.01.log" },
    ];
    expect(newestJournal(files)?.parsed.part).toBe(2);
  });

  it("returns nothing when the folder holds no journal", () => {
    expect(newestJournal([{ name: "Status.json" }])).toBeNull();
    expect(newestJournal([])).toBeNull();
  });
});
