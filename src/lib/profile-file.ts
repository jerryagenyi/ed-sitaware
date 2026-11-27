import {
  exportProfile,
  parseProfileImport,
  type EffectiveProfile,
  type ProfileExport,
} from "./profiles";

export type ProfileFileResult = { ok: true; data: ProfileExport } | { ok: false; error: string };

/** Offer the active profile as a file to share with a squadron. */
export function downloadProfileFile(profile: EffectiveProfile): void {
  const blob = new Blob([JSON.stringify(exportProfile(profile), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileNameFor(profile.name)}.ed-sitaware.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function readProfileFile(file: File): Promise<ProfileFileResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "That file could not be read." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  return parseProfileImport(parsed);
}

function fileNameFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "profile";
}
