/**
 * The parts of the File System Access API this app uses that TypeScript's DOM library
 * does not declare yet. Every member is optional so a browser without the API still
 * type-checks; feature detection happens at run time.
 */
export interface ReadableDirectoryHandle extends FileSystemDirectoryHandle {
  entries?(): AsyncIterableIterator<[string, FileSystemHandle]>;
  values?(): AsyncIterableIterator<FileSystemHandle>;
  queryPermission?(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
}

interface PickerOptions {
  id?: string;
  mode?: "read" | "readwrite";
  startIn?: string;
}

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: PickerOptions) => Promise<FileSystemDirectoryHandle>;
};

function pickerWindow(): PickerWindow | null {
  return typeof window === "undefined" ? null : (window as PickerWindow);
}

/** Chromium browsers (Chrome, Edge) can read a folder the player picks. Firefox and Safari cannot. */
export function canReadLocalFolders(): boolean {
  return typeof pickerWindow()?.showDirectoryPicker === "function";
}

/**
 * Ask the player to choose their journal folder. Resolves to null if they cancel.
 * Must be called straight from the click that triggered it: browsers only show the
 * picker while the page still has the user's gesture.
 */
export async function pickJournalDirectory(): Promise<ReadableDirectoryHandle | null> {
  const picker = pickerWindow()?.showDirectoryPicker;
  if (!picker) {
    throw new Error("This browser cannot read local folders.");
  }
  try {
    return (await picker.call(window, {
      id: "ed_sitaware_journal",
      mode: "read",
      startIn: "documents",
    })) as ReadableDirectoryHandle;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  }
}
