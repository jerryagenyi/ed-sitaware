"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { journal } from "@/sources/journal-controller";
import { useCommanderStore } from "@/store/commander";
import { useSettingsStore } from "@/store/settings";
import { Button } from "@/components/controls";
import { ConnectPanel } from "@/components/connect-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ControlBar } from "@/components/control-bar";
import { Footer } from "@/components/footer";
import { TelemetryStrip } from "@/components/telemetry-strip";
import { TopBar } from "@/components/topbar";
import { WidgetDrawer } from "@/components/widget-drawer";
import { WidgetGrid } from "@/components/widget-grid";

/** Something the player has asked for and is now being asked whether they mean it. */
type Pending = "disconnect" | "forget" | null;

export function Dashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const connection = useCommanderStore((state) => state.connection);
  const hasData = useCommanderStore((state) => state.commander.lastEvent !== null);

  // Settings are read before the first paint, so a returning player's choices never flash.
  useLayoutEffect(() => {
    void useSettingsStore.persist.rehydrate();
    // Until the player picks a theme, it follows the system's own light or dark setting.
    if (!useSettingsStore.getState().themeChosen) {
      useSettingsStore.getState().followSystemTheme();
    }
  }, []);

  useEffect(() => {
    // `?demo=1` opens the dashboard playing a sample session, with no journal needed.
    const demo = new URLSearchParams(window.location.search).get("demo") === "1";
    if (demo) {
      journal.startDemo();
    } else {
      void journal.restore();
    }
    return () => journal.stop();
  }, []);

  // Only tick the clock once there is something to time.
  const now = useNow(hasData ? 1000 : null);

  const attached = connection.state !== "disconnected" && connection.state !== "unsupported";
  const showDashboard = hasData && attached;

  const reconnect = () =>
    void journal.reconnectStored().then((ok) => {
      if (!ok) {
        void journal.pickDirectory();
      }
    });

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        now={now}
        onCustomise={() => setDrawerOpen(true)}
        onDisconnect={() => setPending("disconnect")}
      />

      {showDashboard && connection.state === "error" && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 border-b border-danger/40 bg-danger-soft px-6 py-3 text-small"
        >
          <TriangleAlert className="h-4 w-4 flex-none text-danger" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            {connection.error ?? "The journal could not be read."} What is on screen is where you were.
          </p>
          <Button onClick={reconnect}>
            <RefreshCw aria-hidden="true" />
            Reconnect
          </Button>
        </div>
      )}

      {showDashboard ? (
        <>
          <ControlBar />
          <main className="mx-auto w-full max-w-[1680px] flex-1 px-6 pb-12">
            <TelemetryStrip now={now} />
            <WidgetGrid />
          </main>
        </>
      ) : (
        <main className="mx-auto w-full max-w-[1680px] flex-1 px-6 pb-12">
          <ConnectPanel now={now} />
        </main>
      )}

      <Footer />

      <WidgetDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onDisconnect={() => setPending("disconnect")}
        onForget={() => setPending("forget")}
      />

      <ConfirmDialog
        open={pending === "disconnect"}
        title="Disconnect from your journal?"
        body="The briefing stops following the game. Your folder is remembered, so connecting again is one click."
        confirmLabel="Disconnect"
        cancelLabel="Keep watching"
        onConfirm={() => {
          setPending(null);
          journal.disconnect();
        }}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === "forget"}
        title="Forget this folder?"
        body="ED:SitAware stops asking for this folder, and you will need to choose it again next time. Your profiles and settings are kept."
        confirmLabel="Forget it"
        cancelLabel="Keep it"
        onConfirm={() => {
          setPending(null);
          void journal.forget();
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
