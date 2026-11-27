"use client";

import { useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { journal } from "@/sources/journal-controller";
import { useCommanderStore } from "@/store/commander";
import { useSettingsStore } from "@/store/settings";
import { Button } from "@/components/controls";
import { ConnectPanel } from "@/components/connect-panel";
import { ControlBar } from "@/components/control-bar";
import { TelemetryStrip } from "@/components/telemetry-strip";
import { TopBar } from "@/components/topbar";
import { WidgetDrawer } from "@/components/widget-drawer";
import { WidgetGrid } from "@/components/widget-grid";

export function Dashboard() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const connection = useCommanderStore((state) => state.connection);
  const hasData = useCommanderStore((state) => state.commander.lastEvent !== null);

  useEffect(() => {
    void useSettingsStore.persist.rehydrate();
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
    <div className="min-h-screen">
      <TopBar now={now} onCustomise={() => setDrawerOpen(true)} />

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
          <main className="mx-auto max-w-[1680px] px-6 pb-12">
            <TelemetryStrip now={now} />
            <WidgetGrid />
          </main>
        </>
      ) : (
        <main className="mx-auto max-w-[1680px] px-6 pb-12">
          <ConnectPanel now={now} />
        </main>
      )}

      <WidgetDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
