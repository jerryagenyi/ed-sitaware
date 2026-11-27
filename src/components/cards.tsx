import { ChevronRight, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { formatInt, formatPosition, formatPopulation, UNKNOWN } from "@/lib/format";
import {
  factionStateSeverity,
  stationHazards,
  systemHazards,
  uniqueHazards,
  type Hazard,
} from "@/lib/journal/hazards";
import type { StationInfo } from "@/lib/journal/state";
import {
  isFleetCarrier,
  isSurfaceStation,
  notableServices,
  stationTypeLabel,
} from "@/lib/journal/labels";
import { useCommanderStore } from "@/store/commander";
import { useEffectiveProfile } from "@/store/settings";
import { PAD_FILTERS, type ProfileConfig } from "@/lib/profiles";
import type { PadSize } from "@/lib/ships";
import { FILTER_KEYS, type FilterKey, type WidgetMeta } from "@/lib/widgets";
import { Facts, HudPanel, State } from "@/components/hud-panel";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A faction and the state it is in, coloured when that state is worth noticing. */
function FactionLine({ name, state, activeStates = [] }: { name: string; state: string; activeStates?: readonly string[] }) {
  const notable = [state, ...activeStates].find((candidate) => factionStateSeverity(candidate) !== null);
  const severity = notable ? factionStateSeverity(notable) : null;
  return (
    <>
      {name}
      {notable && notable !== "None" && (
        <>
          {" "}
          <span className={`badge ${severity === "danger" ? "badge--danger" : severity === "warn" ? "badge--warn" : ""}`}>
            {notable}
          </span>
        </>
      )}
    </>
  );
}

export function SystemCard() {
  const system = useCommanderStore((state) => state.commander.system);

  if (!system) {
    return (
      <HudPanel title="Current system">
        <State
          title="No location yet"
          body="Load into a session and the system you are in, who runs it and what state it is in show up here."
        />
      </HudPanel>
    );
  }

  const economies = [system.economy, system.secondEconomy].filter(Boolean).join(" · ") || UNKNOWN;
  const powerplay = [
    system.powerplay.controllingPower,
    ...system.powerplay.powers.filter((power) => power !== system.powerplay.controllingPower),
  ].filter(Boolean);

  return (
    <HudPanel title="Current system">
      <Facts
        items={[
          { label: "Security", value: system.security ?? UNKNOWN },
          { label: "Allegiance", value: system.allegiance ?? UNKNOWN },
          { label: "Economy", value: economies },
          { label: "Government", value: system.government ?? UNKNOWN },
          { label: "Population", value: <span className="hud-value">{formatPopulation(system.population)}</span> },
          {
            label: "Controlling faction",
            value: system.controllingFaction ? (
              <FactionLine
                name={system.controllingFaction.name}
                state={system.controllingFaction.state}
                activeStates={system.controllingFaction.activeStates}
              />
            ) : (
              UNKNOWN
            ),
          },
          {
            label: "Powerplay",
            value: powerplay.length > 0 ? (
              <>
                {powerplay.join(", ")}
                {system.powerplay.state && <span className="badge ml-1">{system.powerplay.state}</span>}
              </>
            ) : (
              system.powerplay.state ?? UNKNOWN
            ),
          },
          {
            label: "Arrival point",
            value:
              system.arrivalBody && system.arrivalBodyType
                ? `${system.arrivalBody} · ${system.arrivalBodyType}`
                : UNKNOWN,
          },
          { label: "Coordinates", value: <span className="hud-value">{formatPosition(system.position)}</span> },
          ...(system.conflicts.length > 0
            ? [
                {
                  label: "Conflicts",
                  value: system.conflicts.map((conflict) => `${capitalize(conflict.type)} · ${conflict.status}`).join(", "),
                },
              ]
            : []),
        ]}
      />
    </HudPanel>
  );
}

function Pads({ pads, yours }: { pads: NonNullable<StationInfo["pads"]>; yours: PadSize | null }) {
  const entries: [string, string, number][] = [
    ["Small", "S", pads.small],
    ["Medium", "M", pads.medium],
    ["Large", "L", pads.large],
  ];
  return (
    <span className="pads">
      {entries.map(([name, size, count]) => (
        <span
          key={size}
          className={`pads__pad ${count === 0 ? "pads__pad--none" : ""} ${yours === size ? "pads__pad--yours" : ""}`}
          title={`${name} pads: ${count}`}
        >
          {size} <span>{count}</span>
        </span>
      ))}
    </span>
  );
}

export function StationCard() {
  const commander = useCommanderStore((state) => state.commander);
  const profile = useEffectiveProfile();
  const { station, lastStation, system } = commander;
  const { distanceFromStarLs, type } = station ?? {};

  if (!station) {
    return (
      <HudPanel title="Current station">
        <State
          title="Not docked"
          body={
            lastStation?.name ? (
              <>
                You left <strong className="font-medium text-fg">{lastStation.name}</strong>
                {lastStation.system && <> in {lastStation.system}</>}. Dock anywhere and its pads, services and
                distance from the star appear here.
              </>
            ) : (
              "Dock anywhere and its pads, services and distance from the star appear here."
            )
          }
        />
      </HudPanel>
    );
  }

  const distance = distanceFromStarLs ?? null;
  const overLimit = distance !== null && distance > profile.maxSupercruiseLs;
  const services = notableServices(station.services);

  return (
    <HudPanel
      title="Current station"
      actions={
        <>
          {isFleetCarrier(type) && <span className="badge">Fleet carrier</span>}
          {isSurfaceStation(type) && <span className="badge badge--warn">Planetary</span>}
        </>
      }
    >
      <p className="mb-1 text-h3 font-semibold">{station.name}</p>
      <p className="mb-4 text-small text-muted">
        {stationTypeLabel(type) ?? "Unknown type"}
        {system?.name && ` · ${system.name}`}
      </p>
      <Facts
        items={[
          {
            label: "From arrival star",
            value: (
              <>
                <span className={`hud-value ${overLimit ? "text-warn" : ""}`}>
                  {distance === null ? UNKNOWN : formatInt(distance)}
                </span>{" "}
                Ls
                {overLimit && (
                  <>
                    {" "}
                    <span className="badge badge--warn">Over your {formatInt(profile.maxSupercruiseLs)} Ls limit</span>
                  </>
                )}
              </>
            ),
          },
          {
            label: "Landing pads",
            value: station.pads ? (
              <Pads pads={station.pads} yours={commander.ship?.padSize ?? null} />
            ) : (
              UNKNOWN
            ),
          },
          { label: "Economy", value: station.economy ?? UNKNOWN },
          { label: "Allegiance", value: station.allegiance ?? UNKNOWN },
          {
            label: "Faction",
            value: station.faction ? <FactionLine name={station.faction.name} state={station.faction.state} /> : UNKNOWN,
          },
          { label: "Government", value: station.government ?? UNKNOWN },
        ]}
      />
      <h3 className="hud-label mb-2 mt-4">Services</h3>
      {services.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Notable services">
          {services.map((service) => (
            <li key={service} className="badge">
              {service}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-muted">No services were listed for this station.</p>
      )}
    </HudPanel>
  );
}

function HazardRow({ hazard }: { hazard: Hazard }) {
  const Icon = hazard.severity === "danger" ? TriangleAlert : hazard.severity === "warn" ? CircleAlert : Info;
  return (
    <li className={`hazard hazard--${hazard.severity}`}>
      <Icon aria-hidden="true" />
      <div>
        <p className="hazard__title">{hazard.label}</p>
        {hazard.detail && <p className="hazard__detail">{hazard.detail}</p>}
      </div>
    </li>
  );
}

/** The `hazard_alerts` widget: everything the journal flags about here and now. */
export function HazardCard({ widget }: { widget: WidgetMeta }) {
  const commander = useCommanderStore((state) => state.commander);
  const profile = useEffectiveProfile();
  // The station's faction is often the system's too: say each warning once.
  const hazards = uniqueHazards([
    ...stationHazards(commander.station, profile.maxSupercruiseLs),
    ...systemHazards(commander.system),
  ]);

  return (
    <HudPanel title={widget.label} actions={<span className="badge">From your journal</span>}>
      {hazards.length === 0 ? (
        <State
          title="All clear"
          body={
            commander.system
              ? `Nothing in your journal flags ${commander.system.name} or the station you are at. Check the limit in the control bar if you want a shorter leash.`
              : "Once you are in a system, long approaches, planetary ports and factions in Lockdown are flagged here."
          }
        />
      ) : (
        <ul>
          {hazards.map((hazard) => (
            <HazardRow key={hazard.id} hazard={hazard} />
          ))}
        </ul>
      )}
    </HudPanel>
  );
}

export function filterValue(
  key: FilterKey,
  config: Pick<ProfileConfig, "radiusLy" | "maxSupercruiseLs" | "padFilter" | "excludeFleetCarriers">,
  shipPadSize: PadSize | null,
): string {
  switch (key) {
    case "radiusLy":
      return `${config.radiusLy} ly`;
    case "padSize":
      if (config.padFilter !== "auto") {
        return PAD_FILTERS.find((filter) => filter.id === config.padFilter)?.label ?? "Auto";
      }
      return shipPadSize ? `Auto · ${shipPadSize} pad` : "Auto";
    case "supercruise":
      return `Up to ${formatInt(config.maxSupercruiseLs)} Ls`;
    case "fleetCarriers":
      return config.excludeFleetCarriers ? "Excluded" : "Included";
  }
}

const SECTOR_NOTE = "The sector feed that answers this is still being built. Your filters are saved and apply the moment it connects.";

/** A widget whose answers come from the sector feed: says what it will look for. */
export function PendingWidgetCard({
  widget,
  config,
  shipPadSize,
}: {
  widget: WidgetMeta;
  config: Pick<ProfileConfig, "radiusLy" | "maxSupercruiseLs" | "padFilter" | "excludeFleetCarriers">;
  shipPadSize: PadSize | null;
}) {
  const keys = FILTER_KEYS.filter((key) => widget.filters[key]);
  return (
    <HudPanel title={widget.label} actions={<span className="badge">Sector feed</span>}>
      <p className="text-small text-muted">{widget.description}</p>
      <h3 className="hud-label mb-2 mt-4">Will search</h3>
      <Facts
        items={keys.map((key) => ({
          label: widget.filters[key] ?? key,
          value: (
            <>
              <ChevronRight className="mr-1 inline-block h-3.5 w-3.5 -align-px text-faint" aria-hidden="true" />
              {filterValue(key, config, shipPadSize)}
            </>
          ),
        }))}
      />
      <p className="mt-4 border-t border-line pt-3 text-caption leading-relaxed text-muted">{SECTOR_NOTE}</p>
    </HudPanel>
  );
}

