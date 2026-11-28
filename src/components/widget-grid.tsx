"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { moveCard } from "@/lib/card-order";
import { isWidgetEnabled } from "@/lib/profiles";
import { useCommanderStore } from "@/store/commander";
import { useEffectiveProfile, useSettingsStore } from "@/store/settings";
import { WIDGETS, type WidgetId, type WidgetMeta } from "@/lib/widgets";
import { HazardCard, PendingWidgetCard, StationCard, SystemCard } from "@/components/cards";

const WIDGET_BY_ID = Object.fromEntries(WIDGETS.map((widget) => [widget.id, widget])) as Record<
  WidgetId,
  WidgetMeta
>;

/** Everything the briefing shows, in the order the player has put it: where they are, then each widget. */
export function WidgetGrid() {
  const profile = useEffectiveProfile();
  const cardOrder = useSettingsStore((state) => state.cardOrder);
  const setCardOrder = useSettingsStore((state) => state.setCardOrder);
  const shipPadSize = useCommanderStore((state) => state.commander.ship?.padSize ?? null);

  const cards = cardOrder.filter(
    (id) => id === "system" || id === "station" || isWidgetEnabled(profile, id),
  );

  // A pointer drag has to move a little before it counts, so a tap on the grip is only a tap.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }
    setCardOrder(moveCard(cardOrder, String(active.id), String(over.id)));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={cards} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((id) => {
            if (id === "system") {
              return <SystemCard key={id} />;
            }
            if (id === "station") {
              return <StationCard key={id} />;
            }
            const widget = WIDGET_BY_ID[id];
            return widget.source === "journal" ? (
              <HazardCard key={id} widget={widget} />
            ) : (
              <PendingWidgetCard key={id} widget={widget} config={profile} shipPadSize={shipPadSize} />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
