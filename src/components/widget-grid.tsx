"use client";

import { enabledWidgetIds } from "@/lib/profiles";
import { WIDGETS, type WidgetId, type WidgetMeta } from "@/lib/widgets";
import { useCommanderStore } from "@/store/commander";
import { useEffectiveProfile } from "@/store/settings";
import { HazardCard, PendingWidgetCard, StationCard, SystemCard } from "@/components/cards";

const WIDGET_BY_ID = Object.fromEntries(WIDGETS.map((widget) => [widget.id, widget])) as Record<
  WidgetId,
  WidgetMeta
>;

// What the journal can already answer leads: it is the live part of the briefing.
const rank = (widget: WidgetMeta) => (widget.source === "journal" ? 0 : 1);

/** Everything the briefing shows: where you are, then each widget the profile switches on. */
export function WidgetGrid() {
  const profile = useEffectiveProfile();
  const shipPadSize = useCommanderStore((state) => state.commander.ship?.padSize ?? null);

  const widgets = enabledWidgetIds(profile)
    .map((id) => WIDGET_BY_ID[id])
    .sort((a, b) => rank(a) - rank(b));

  return (
    <div className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2 xl:grid-cols-3">
      <SystemCard />
      <StationCard />
      {widgets.map((widget) =>
        widget.source === "journal" ? (
          <HazardCard key={widget.id} widget={widget} />
        ) : (
          <PendingWidgetCard key={widget.id} widget={widget} config={profile} shipPadSize={shipPadSize} />
        ),
      )}
    </div>
  );
}
