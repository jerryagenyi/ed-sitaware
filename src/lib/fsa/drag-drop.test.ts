import { describe, expect, it } from "vitest";
import { readDroppedFolder } from "./drag-drop";

const dropWith = (items: unknown[]) => ({ dataTransfer: { items } }) as unknown as DragEvent;

describe("readDroppedFolder", () => {
  it("returns nothing when there is nothing that could be a folder", async () => {
    expect(await readDroppedFolder(dropWith([]))).toBeNull();
    expect(await readDroppedFolder({ dataTransfer: null } as unknown as DragEvent)).toBeNull();
    expect(await readDroppedFolder(dropWith([{ kind: "string" }]))).toBeNull();
  });

  it("says so when the browser cannot turn a dropped folder into a handle", async () => {
    expect(await readDroppedFolder(dropWith([{ kind: "file" }]))).toBe("unsupported");
  });

  it("tells a single file from the folder that holds the journals", async () => {
    const dropped = dropWith([
      { kind: "file", getAsFileSystemHandle: async () => ({ kind: "file", name: "Journal.2026-01-01T000000.01.log" }) },
    ]);
    expect(await readDroppedFolder(dropped)).toBe("file");
  });

  it("gives the folder itself as a handle", async () => {
    const directory = { kind: "directory", name: "Elite Dangerous" };
    const dropped = dropWith([{ kind: "file", getAsFileSystemHandle: async () => directory }]);
    expect(await readDroppedFolder(dropped)).toBe(directory);
  });

  it("reads the dropped items before the browser clears them", async () => {
    const directory = { kind: "directory", name: "Elite Dangerous" };
    const items = [{ kind: "file", getAsFileSystemHandle: async () => directory }];
    const dropped = dropWith(items);
    const reading = readDroppedFolder(dropped);
    // Browsers empty this list as soon as the drop handler returns.
    items.length = 0;
    expect(await reading).toBe(directory);
  });
});
