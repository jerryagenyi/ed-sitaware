// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LineBuffer, parseJournalLine } from "./parse";

describe("parseJournalLine", () => {
  it("parses an event the app reads", () => {
    const line = '{"timestamp":"2026-11-24T12:37:21Z","event":"Docked","StationName":"Jameson Memorial"}';
    expect(parseJournalLine(line)).toMatchObject({ kind: "event", event: { event: "Docked" } });
  });

  it("skips events the app does not read without parsing them", () => {
    // A syntactically broken line is fine as long as the event is one we ignore.
    const line = '{"timestamp":"2026-11-24T12:37:21Z","event":"NavRoute","Route":[this is not json';
    expect(parseJournalLine(line)).toEqual({ kind: "ignored" });
  });

  it("tolerates a byte-order mark and trailing whitespace", () => {
    const line = '\ufeff{"timestamp":"2026-11-24T12:37:21Z","event":"Fileheader"}\r';
    expect(parseJournalLine(line)).toMatchObject({ kind: "event" });
  });

  it("reports a handled event whose line is not valid JSON", () => {
    expect(parseJournalLine('{"timestamp":"2026-11-24T12:37:21Z","event":"Docked","StationName":')).toEqual({
      kind: "invalid",
    });
  });

  it("ignores blank lines", () => {
    expect(parseJournalLine("   ")).toEqual({ kind: "ignored" });
  });
});

describe("LineBuffer", () => {
  const encode = (text: string) => new TextEncoder().encode(text);

  it("returns only lines that have been terminated", () => {
    const buffer = new LineBuffer();
    expect(buffer.push(encode('{"event":"A"}\r\n{"event":"B"}'))).toEqual(['{"event":"A"}\r']);
    expect(buffer.hasPending).toBe(true);
    expect(buffer.push(encode("\n"))).toEqual(['{"event":"B"}']);
    expect(buffer.hasPending).toBe(false);
  });

  it("keeps a multi-byte character split across two reads intact", () => {
    const bytes = encode('{"event":"LoadGame","Commander":"Zoë"}\n');
    const buffer = new LineBuffer();
    // Split inside the two-byte "ë".
    const split = bytes.indexOf(0xc3) + 1;
    expect(buffer.push(bytes.slice(0, split))).toEqual([]);
    expect(buffer.push(bytes.slice(split))).toEqual(['{"event":"LoadGame","Commander":"Zoë"}']);
  });

  it("handles many lines arriving in one chunk", () => {
    const lines = ["one", "two", "three"].map((n) => `${n}\n`).join("");
    expect(new LineBuffer().push(encode(lines))).toEqual(["one", "two", "three"]);
  });

  it("can be reset when the source switches files", () => {
    const buffer = new LineBuffer();
    buffer.push(encode("half a li"));
    buffer.reset();
    expect(buffer.hasPending).toBe(false);
  });
});
