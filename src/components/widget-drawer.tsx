"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  FolderOpen,
  GripVertical,
  Pin,
  Play,
  RotateCcw,
  Save,
  Trash2,
  Unplug,
  Upload,
  X,
} from "lucide-react";
import { formatInt } from "@/lib/format";
import { isDefaultCardOrder } from "@/lib/card-order";
import { downloadProfileFile, readProfileFile } from "@/lib/profile-file";
import type { EffectiveProfile } from "@/lib/profiles";
import { WIDGETS, WIDGET_CATEGORIES } from "@/lib/widgets";
import { useCommanderStore } from "@/store/commander";
import { useEffectiveProfile, useSettingsStore } from "@/store/settings";
import { journal } from "@/sources/journal-controller";
import { Button } from "@/components/controls";

/**
 * The active profile and what can be done with it. Its state (a half-typed name, a
 * pending delete) belongs to one profile only, so the drawer gives it a key and it is
 * remounted, clean, whenever the profile changes.
 */
function ProfileSection({ profile }: { profile: EffectiveProfile }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const saveAsCustomProfile = useSettingsStore((state) => state.saveAsCustomProfile);
  const resetProfile = useSettingsStore((state) => state.resetProfile);
  const deleteProfile = useSettingsStore((state) => state.deleteProfile);
  const importProfile = useSettingsStore((state) => state.importProfile);

  const handleImport = async (input: HTMLInputElement | null) => {
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    const result = await readProfileFile(file);
    if (result.ok) {
      importProfile(result.data);
    } else {
      setImportError(result.error);
    }
    if (input) {
      input.value = "";
    }
  };

  return (
    <section aria-labelledby="drawer-profile" className="pb-5">
      <h3 id="drawer-profile" className="hud-label mb-2">
        Profile
      </h3>
      <p className="text-body font-semibold">{profile.name}</p>
      <p className="text-small text-muted">{profile.blurb}</p>
      {profile.builtIn && (
        <p className="mt-2 text-small text-muted">
          {profile.modified
            ? "You have changed this preset. Save it as a profile to keep the changes, or put it back to its defaults."
            : "A preset. Change anything and save it as a profile of your own."}
        </p>
      )}

      {saving && (
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveAsCustomProfile(name);
          }}
        >
          <label htmlFor="profile-name" className="sr-only">
            Profile name
          </label>
          <input
            id="profile-name"
            className="text-input max-w-60"
            value={name}
            maxLength={60}
            autoFocus
            placeholder="Name this profile"
            onChange={(event) => setName(event.target.value)}
          />
          <Button type="submit" variant="primary">
            Save
          </Button>
          <Button onClick={() => setSaving(false)}>Cancel</Button>
        </form>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {profile.builtIn && profile.modified && (
          <>
            <Button onClick={() => setSaving(true)}>
              <Save aria-hidden="true" />
              Save as profile
            </Button>
            <Button
              aria-label={`Reset ${profile.name} to its defaults`}
              title="Put this preset back to its defaults. Your changes here are discarded."
              onClick={resetProfile}
            >
              <RotateCcw aria-hidden="true" />
              Reset to defaults
            </Button>
          </>
        )}
        {!profile.builtIn && (
          <Button
            variant="danger"
            onClick={() => {
              if (confirmDelete) {
                deleteProfile(profile.id);
              } else {
                setConfirmDelete(true);
              }
            }}
          >
            <Trash2 aria-hidden="true" />
            {confirmDelete ? "Really delete?" : "Delete"}
          </Button>
        )}
        <Button onClick={() => downloadProfileFile(profile)}>
          <Download aria-hidden="true" />
          Export
        </Button>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload aria-hidden="true" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void handleImport(event.target)}
        />
      </div>
      {importError && (
        <p role="alert" className="mt-3 text-small text-danger">
          {importError}
        </p>
      )}
    </section>
  );
}

/** Cards go where the player drags them; this is the way back to the starting order. */
function CardOrderSection() {
  const cardOrder = useSettingsStore((state) => state.cardOrder);
  const resetCardOrder = useSettingsStore((state) => state.resetCardOrder);

  return (
    <section aria-labelledby="drawer-order" className="border-t border-line pb-2 pt-4">
      <h3 id="drawer-order" className="hud-label mb-2 flex items-center gap-2">
        <GripVertical className="h-4 w-4" aria-hidden="true" />
        Card order
      </h3>
      <p className="text-small text-muted">
        Drag the grip on any card to move it, on any screen. With a keyboard, press space on the grip, move
        with the arrow keys, and press space to let go.
      </p>
      {!isDefaultCardOrder(cardOrder) && (
        <div className="mt-3">
          <Button
            aria-label="Put the cards back in their starting order"
            title="Put the cards back in the order they had when you arrived."
            onClick={resetCardOrder}
          >
            <RotateCcw aria-hidden="true" />
            Reset card order
          </Button>
        </div>
      )}
    </section>
  );
}

interface WidgetDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The player asked to disconnect. The caller checks they mean it. */
  onDisconnect: () => void;
  /** The player asked to forget the folder. The caller checks they mean it. */
  onForget: () => void;
}

/** The "checkbox everything" drawer: every widget on or off, pinnable, plus profiles. */
export function WidgetDrawer({ open, onClose, onDisconnect, onForget }: WidgetDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const profile = useEffectiveProfile();
  const toggleWidget = useSettingsStore((state) => state.toggleWidget);
  const togglePin = useSettingsStore((state) => state.togglePin);
  const connection = useCommanderStore((state) => state.connection);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog ref={dialogRef} className="drawer" aria-labelledby="drawer-title" onClose={onClose}>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 id="drawer-title" className="text-h3 font-semibold">
            Customise briefing
          </h2>
          <Button icon aria-label="Close" onClick={() => dialogRef.current?.close()}>
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ProfileSection key={profile.id} profile={profile} />

          {WIDGET_CATEGORIES.map((category) => {
            const widgets = WIDGETS.filter((widget) => widget.category === category);
            return (
              <fieldset key={category} className="border-t border-line pb-2 pt-4">
                <legend className="hud-label px-1">{category}</legend>
                {widgets.map((widget) => {
                  const pinned = profile.pinnedWidgets.includes(widget.id);
                  const on = profile.enabledWidgets[widget.id] || pinned;
                  return (
                    <div key={widget.id} className="widget-row">
                      <input
                        type="checkbox"
                        id={`widget-${widget.id}`}
                        checked={on}
                        onChange={() => toggleWidget(widget.id)}
                      />
                      <label htmlFor={`widget-${widget.id}`} className="min-w-0 cursor-pointer">
                        <span className="block text-small font-medium">{widget.label}</span>
                        <span className="block text-caption text-muted">{widget.description}</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn--icon pin"
                        aria-pressed={pinned}
                        aria-label={`${pinned ? "Unpin" : "Pin"} ${widget.label} on every profile`}
                        title={pinned ? "Pinned on every profile" : "Pin on every profile"}
                        onClick={() => togglePin(widget.id)}
                      >
                        <Pin aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </fieldset>
            );
          })}

          <CardOrderSection />

          <section aria-labelledby="drawer-journal" className="border-t border-line pt-4">
            <h3 id="drawer-journal" className="hud-label mb-2">
              Journal
            </h3>
            {connection.source === "demo" ? (
              <p className="text-small text-muted">
                Playing a made-up session.{" "}
                <Button onClick={() => journal.startDemo()}>
                  <Play aria-hidden="true" />
                  Replay
                </Button>
              </p>
            ) : connection.folderName ? (
              <>
                <dl className="facts">
                  <div className="facts__item">
                    <dt className="hud-label">Folder</dt>
                    <dd className="break-all">{connection.folderName}</dd>
                  </div>
                  <div className="facts__item">
                    <dt className="hud-label">File</dt>
                    <dd className="hud-value break-all">{connection.fileName ?? "—"}</dd>
                  </div>
                </dl>
                {connection.pollIntervalMs && (
                  <p className="mt-3 text-small text-muted">
                    Checked every {formatInt(connection.pollIntervalMs)} ms while you play. Opened read-only;
                    nothing leaves this computer.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => void journal.pickDirectory()}>
                    <FolderOpen aria-hidden="true" />
                    Change folder
                  </Button>
                  <Button onClick={onDisconnect}>
                    <Unplug aria-hidden="true" />
                    Disconnect
                  </Button>
                  <Button variant="danger" onClick={onForget}>
                    Forget this folder
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-small text-muted">Not connected.</p>
            )}
          </section>
        </div>
      </div>
    </dialog>
  );
}
