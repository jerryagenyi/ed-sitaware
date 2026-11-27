"use client";

import {
  useSyncExternalStore,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { Check, Copy, FolderOpen, Play, RefreshCw } from "lucide-react";
import { canReadLocalFolders } from "@/lib/fsa/directory-access";
import {
  detectPlatform,
  journalLocation,
  otherLocation,
  type JournalLocation,
} from "@/lib/os";
import { useCommanderStore } from "@/store/commander";
import { journal } from "@/sources/journal-controller";
import { Button } from "@/components/controls";

const subscribeToNothing = () => () => undefined;

/** After this long the first read gets an explanation rather than a silent wait. */
const SLOW_AFTER_MS = 15_000;

function browserPlatform(): { platform?: string; userAgent: string } | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  const clientHints = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData;
  return { platform: clientHints?.platform, userAgent: navigator.userAgent };
}

/** Copies the journal path, and says whether it managed to. */
function CopyPathButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") {
      return;
    }
    const timer = setTimeout(() => setStatus("idle"), status === "copied" ? 2500 : 6000);
    return () => clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <>
      <Button onClick={() => void copy()}>
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {status === "copied" ? "Copied" : "Copy path"}
      </Button>
      <span className="sr-only" role="status">{status === "copied" && "Path copied to the clipboard."}</span>
      {status === "failed" && (
        <span role="status" className="basis-full text-small text-warn">
          The path could not be copied for you. Select it above and copy it yourself.
        </span>
      )}
    </>
  );
}

/**
 * The folder is the one thing new players cannot find, because it is not where the
 * game is installed and Windows keeps it out of sight. Say exactly where it is and
 * how to get the picker to open there.
 */
function WhereIsIt({
  location,
  elsewhere,
}: {
  location: JournalLocation;
  elsewhere: JournalLocation | null;
}) {
  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="text-small font-semibold">Where is that folder?</h3>
      <p className="mt-1 text-small text-muted">
        Not where the game is installed. On {location.system} it is {location.where}, and it holds files
        named <code className="font-mono text-fg">Journal.*.log</code>.
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 break-all rounded-[3px] border border-line bg-bg px-2 py-1.5 font-mono text-small text-fg">
          {location.path}
        </code>
        <CopyPathButton text={location.path} />
      </p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-small text-muted marker:text-fg">
        <li>
          Click <strong className="font-medium text-fg">Copy path</strong>.
        </li>
        <li>
          Click <strong className="font-medium text-fg">Choose journal folder</strong>.
        </li>
        <li>
          Paste the path into the address bar at the top of the picker, press Enter, then click{" "}
          <strong className="font-medium text-fg">Select folder</strong>.
        </li>
      </ol>
      <details className="mt-3 text-small text-muted">
        <summary className="cursor-pointer text-fg">If the path does not work</summary>
        <p className="mt-2">{location.fallback}</p>
      </details>
      {elsewhere && (
        <details className="mt-2 text-small text-muted">
          <summary className="cursor-pointer text-fg">On {elsewhere.system}</summary>
          <p className="mt-2">
            It is {elsewhere.where}. The path to paste is{" "}
            <code className="break-all font-mono text-fg">{elsewhere.path}</code>. {elsewhere.fallback}
          </p>
        </details>
      )}
    </div>
  );
}

function StateBlock({ title, body, actions }: { title: string; body: ReactNode; actions?: ReactNode }) {
  return (
    <div className="state">
      <h2 className="state__title">{title}</h2>
      <div className="state__body flex flex-col gap-3 text-body leading-relaxed">{body}</div>
      {actions && <div className="state__actions">{actions}</div>}
    </div>
  );
}

interface ConnectPanelProps {
  now: number;
}

export function ConnectPanel({ now }: ConnectPanelProps) {
  const connection = useCommanderStore((state) => state.connection);
  const { state, storedFolderName, folderName, fileName, error, changedAt } = connection;
  const [dragging, setDragging] = useState(false);
  const [dropMessage, setDropMessage] = useState<string | null>(null);
  const dragDepth = useRef(0);

  // False while the server's markup is being hydrated, true after: the first safe
  // moment to ask what the browser can do.
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const supported = isClient ? canReadLocalFolders() : null;
  const platform = isClient ? detectPlatform(browserPlatform()) : "other";
  const location = isClient ? journalLocation(platform) : null;

  const canDrop = supported === true && state !== "connecting" && state !== "live";
  const carriesFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const handleDragEnter = (event: DragEvent) => {
    if (!canDrop || !carriesFiles(event)) {
      return;
    }
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragOver = (event: DragEvent) => {
    if (!canDrop || !carriesFiles(event)) {
      return;
    }
    // Calling preventDefault here marks the panel as somewhere a drop may land.
    event.preventDefault();
  };

  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setDragging(false);
    }
  };

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    setDropMessage(null);
    const outcome = await journal.dropDirectory(event);
    if (outcome === "file") {
      setDropMessage("That was a single file. Drop the whole Elite Dangerous folder instead.");
    } else if (outcome === "unsupported") {
      setDropMessage("This browser cannot take a dropped folder. Use the button instead.");
    }
  };

  const pick = () => void journal.pickDirectory();
  const reconnect = () =>
    void journal.reconnectStored().then((ok) => {
      if (!ok) {
        pick();
      }
    });

  const watchDemo = (
    <Button onClick={() => journal.startDemo()}>
      <Play aria-hidden="true" />
      Watch a demo session
    </Button>
  );

  let title: string;
  let body: ReactNode;
  let actions: ReactNode = null;
  let showWhereIsIt = false;

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
        title = "No journal files in this folder";
        body = location ? (
          <>
            Watching “{folderName ?? "this folder"}”. It is probably the wrong one: the journal folder is{" "}
            {location.where} and holds files named{" "}
            <code className="font-mono text-fg">Journal.*.log</code>.
          </>
        ) : (
          `Watching “${folderName ?? "this folder"}”.`
        );
        actions = (
          <>
            <Button variant="primary" onClick={pick}>
              <FolderOpen aria-hidden="true" />
              Choose another folder
            </Button>
            {watchDemo}
          </>
        );
        showWhereIsIt = true;
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
              {watchDemo}
            </>
          );
        } else {
          title = "Connect your journal";
          showWhereIsIt = true;
          body = (
            <>
              <p>
                Elite Dangerous writes everything you do to Journal files on this computer. Let ED:SitAware read
                them and it briefs you on the space around you as you fly: no typing, no searching.
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
              {watchDemo}
            </>
          );
        }
    }
  }

  return (
    <section className="mx-auto max-w-3xl pt-10" aria-label="Journal connection">
      <div
        className="hud-panel drop-target"
        data-dragging={dragging ? "true" : "false"}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(event) => void handleDrop(event)}
      >
        <div className="hud-panel__body py-5">
          <StateBlock title={title} body={body} actions={actions} />
          {dropMessage && (
            <p role="status" className="mt-4 text-small text-warn">
              {dropMessage}
            </p>
          )}
          {canDrop && (
            <p className="mt-4 text-caption text-muted">
              You can also drag the folder from your file manager onto this panel.
            </p>
          )}
          {showWhereIsIt && location && (
            <WhereIsIt location={location} elsewhere={otherLocation(platform)} />
          )}
        </div>
        <div className="drop-target__overlay" aria-hidden="true">
          Drop the journal folder to connect
        </div>
      </div>
    </section>
  );
}
