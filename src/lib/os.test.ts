// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detectPlatform, journalLocation, otherLocation } from "./os";

describe("detectPlatform", () => {
  it("recognises Windows", () => {
    expect(detectPlatform({ platform: "Windows" })).toBe("windows");
    expect(detectPlatform({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130" })).toBe(
      "windows",
    );
  });

  it("recognises Linux and ChromeOS", () => {
    expect(detectPlatform({ platform: "Linux" })).toBe("linux");
    expect(detectPlatform({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/130" })).toBe("linux");
    expect(detectPlatform({ userAgent: "Mozilla/5.0 (X11; CrOS x86_64) Chrome/130" })).toBe("linux");
  });

  it("treats phones, tablets and Macs as neither, since they cannot read folders", () => {
    for (const userAgent of [
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/130",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605",
    ]) {
      expect(detectPlatform({ userAgent })).toBe("other");
    }
  });

  it("says nothing rather than guessing", () => {
    expect(detectPlatform(null)).toBe("other");
    expect(detectPlatform(undefined)).toBe("other");
    expect(detectPlatform({})).toBe("other");
  });
});

describe("journalLocation", () => {
  it("describes the Windows folder, which is not where the game is installed", () => {
    const windows = journalLocation("windows");
    expect(windows.system).toBe("Windows");
    expect(windows.path).toBe(
      "%USERPROFILE%\\Saved Games\\Frontier Developments\\Elite Dangerous",
    );
    expect(windows.where).toContain("Saved Games");
    expect(windows.fallback).toContain("shell:savedgames");
  });

  it("describes the Proton folder for Linux", () => {
    const linux = journalLocation("linux");
    expect(linux.path).toContain("compatdata/359320");
    expect(linux.path.endsWith("Saved Games/Frontier Developments/Elite Dangerous")).toBe(true);
  });

  it("shows the Windows folder whenever the system is unknown", () => {
    expect(journalLocation("other")).toEqual(journalLocation("windows"));
  });
});

describe("otherLocation", () => {
  it("offers the other system's folder, and nothing when the system is unknown", () => {
    expect(otherLocation("windows")?.system).toContain("Linux");
    expect(otherLocation("linux")?.system).toBe("Windows");
    expect(otherLocation("other")).toBeNull();
  });
});
