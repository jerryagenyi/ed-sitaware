"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { FolderOpen, Play, RefreshCw } from "lucide-react";
import { canReadLocalFolders } from "@/lib/fsa/directory-access";
import { useCommanderStore } from "@/store/commander";
import { journal } from "@/sources/journal-controller";
import { Button } from "@/components/controls";
import { HudPanel } from "@/components/hud-panel";

const WINDOWS_PATH = "Saved Games\\Frontier Developments\\Elite Dangerous";
const MACOS_PATH = "~/Library/Application Support/Frontier Developments/Elite Dangerous";

/** After this long the first read gets an explanation rather than a silent wait. */
const SLOW_AFTER_MS = 15_000;

const subscribeToNothing = () => () => undefined;

export function ConnectPanel({ now }: { now: number }) {
  const connection = useCommanderStore((state) => state.connection);
  const { state, storedFolderName, folderName, fileName, error, changedAt } = connection;

  // False while the server's markup is being hydrated, true after: the first safe
  // moment to ask what the browser can do.
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const supported = isClient ? canReadLocalFolders() : null;

  const pick = () => void journal.pickDirectory();
  const reconnect = () =>
    void journal.reconnectStored().then((ok) => {
      if (!ok) {
        pick();
      }
    });

  let title: string;
  let body: ReactNode;
  let actions: ReactNode = null;

  if (state === "unsupported" || supported === false) {
    title = "This browser cannot read local folders";
    body =
      "Opening your journal needs a capability only Chromium browsers have. Use Chrome or Edge; Firefox and Safari cannot do it.";
    actions = (
      <Button variant="primary" onClick={() => journal.startDemo()}>
        <Play aria-hidden="true" />
        Watch a demo session
      </Button>
    );
  } else {
    switch (state) {
      case "connecting":
        title = "Reading your journal";
        body =
          "Finding the newest Journal file and loading your last session." +
          (changedAt !== null && now - changedAt > SLOW_AFTER_MS
            ? " This is taking longer than expected; a large journal can need a moment the first time."
            : "");
        break;
      case "empty":
        title = "No journal in this folder yet";
        body =
          folderName ? `Watching “${folderName}”. Launch Elite Dangerous and your session appears here.` : "Launch Elite Dangerous and your session appears here.";
        actions = (
          <>
            <Button onClick={pick}>
              <FolderOpen aria-hidden="true" />
              Choose another folder
            </Button>
            <Button onClick={() => journal.startDemo()}>
              <Play aria-hidden="true" />
              Watch a demo session
            </Button>
          </>
        );
        break;
      case "error":
        title = "The journal could not be read";
        body = error ?? "The folder could not be read. Reconnect to try again.";
        actions = (
          <>
            <Button variant="primary" onClick={reconnect}>
              <RefreshCw aria-hidden="true" />
              Reconnect
            </Button>
            <Button onClick={pick}>
              <FolderOpen aria-hidden="true" />
              Choose another folder
            </Button>
          </>
        );
        break;
      case "live":
        title = "Waiting for your first event";
        body = `Reading ${fileName ?? "your journal"}. Load into the game and your location appears here.`;
        break;
      default:
        if (storedFolderName) {
          title = "Welcome back, Commander";
          body = `Reconnect to “${storedFolderName}” to pick up where you left off. Your profiles and filters are as you left them.`;
          actions = (
            <>
              <Button variant="primary" onClick={reconnect}>
                <RefreshCw aria-hidden="true" />
                Reconnect
              </Button>
              <Button onClick={pick}>
                <FolderOpen aria-hidden="true" />
                Choose another folder
              </Button>
              <Button onClick={() => journal.startDemo()}>
                <Play aria-hidden="true" />
                Watch a demo session
              </Button>
            </>
          );
        } else {
          title = "Connect your journal";
          body = (
            <>
              <p>
                Elite Dangerous writes everything you do to Journal files on this computer. Let ED:SitAware read
                them and it briefs you on the space around you as you fly: no typing, no searching.
              </p>
              <p>
                On Windows the folder is <code>{WINDOWS_PATH}</code>. On a Mac it is <code>{MACOS_PATH}</code>.
              </p>
              <p>The folder is opened read-only and nothing leaves this device. There is no account.</p>
            </>
          );
          actions = (
            <>
              <Button variant="primary" onClick={pick}>
                <FolderOpen aria-hidden="true" />
                Choose journal folder
              </Button>
              <Button onClick={() => journal.startDemo()}>
                <Play aria-hidden="true" />
                Watch a demo session
              </Button>
            </>
          );
        }
    }
  }

  return (
    <section className="mx-auto max-w-3xl pt-10" aria-label="Journal connection">
      <HudPanel title="Journal">
        <div className="py-4">
          <div className="state">
            <h2 className="state__title">{title}</h2>
            <div className="state__body flex flex-col gap-3 text-body leading-relaxed">{body}</div>
            {actions && <div className="state__actions">{actions}</div>}
          </div>
        </div>
      </HudPanel>
    </section>
  );
}
