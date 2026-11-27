import type { ReadableDirectoryHandle } from "./directory-access";

/** The part of a drop event that is needed. React's synthetic event satisfies it too. */
export interface DropCarrier {
  dataTransfer: DataTransfer | null;
}

/** What a drop turned out to hold. */
export type DroppedFolder =
  | ReadableDirectoryHandle
  /** A single file, such as one journal, rather than the folder that holds them. */
  | "file"
  /** This browser cannot turn a dropped folder into a handle. */
  | "unsupported"
  /** Nothing was dropped that could be a folder. */
  | null;

type DroppableItem = DataTransferItem & {
  getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
};

/**
 * The folder the player dropped, as a handle — the same kind the picker gives, so
 * dropping is a full alternative to picking. Chromium only, like the picker.
 *
 * The dropped items must be read before the first `await`: browsers empty them as
 * soon as the drop event has been handled.
 */
export async function readDroppedFolder(event: DropCarrier): Promise<DroppedFolder> {
  const item = event.dataTransfer?.items?.[0] as DroppableItem | undefined;
  if (!item || item.kind !== "file") {
    return null;
  }
  const asHandle = item.getAsFileSystemHandle;
  if (!asHandle) {
    return "unsupported";
  }
  const handle = await asHandle.call(item);
  if (!handle) {
    return null;
  }
  return handle.kind === "directory" ? (handle as ReadableDirectoryHandle) : "file";
}
