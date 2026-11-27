/**
 * The intelligence modules a profile can switch on or off. A widget is either answered
 * from the player's own journal or needs the sector feed (the backend that knows about
 * every port within the radius).
 */
export type WidgetId =
  | "nearest_ports"
  | "material_traders"
  | "interstellar_factors"
  | "tech_brokers"
  | "hazard_alerts"
  | "market_opportunities"
  | "mining_reserves"
  | "combat_zones";

export type WidgetCategory = "Universal" | "Economy" | "Exploration & Mining" | "Combat";

/** Global filters a widget honours, each shown as one row of its query readout. */
export type FilterKey = "radiusLy" | "padSize" | "supercruise" | "fleetCarriers";

export interface WidgetMeta {
  id: WidgetId;
  label: string;
  description: string;
  category: WidgetCategory;
  /** `journal` widgets can be answered from the player's own log; `sector` widgets need the feed. */
  source: "journal" | "sector";
  filters: Partial<Record<FilterKey, string>>;
}

export const WIDGET_CATEGORIES: readonly WidgetCategory[] = [
  "Universal",
  "Economy",
  "Exploration & Mining",
  "Combat",
];

export const WIDGETS: readonly WidgetMeta[] = [
  {
    id: "nearest_ports",
    label: "Nearest ports & services",
    description: "Ports within your radius, ranked by distance, with pads, economy and allegiance.",
    category: "Universal",
    source: "sector",
    filters: {
      radiusLy: "Search radius",
      padSize: "Landing pad",
      supercruise: "Supercruise limit",
      fleetCarriers: "Fleet carriers",
    },
  },
  {
    id: "material_traders",
    label: "Material traders",
    description: "Closest raw, manufactured and encoded material traders.",
    category: "Universal",
    source: "sector",
    filters: { radiusLy: "Search radius", padSize: "Landing pad", supercruise: "Supercruise limit" },
  },
  {
    id: "interstellar_factors",
    label: "Interstellar factors",
    description: "Nearest contacts for clearing bounties and fines.",
    category: "Universal",
    source: "sector",
    filters: { radiusLy: "Search radius", supercruise: "Supercruise limit" },
  },
  {
    id: "tech_brokers",
    label: "Tech brokers",
    description: "Human and Guardian tech brokers nearby.",
    category: "Universal",
    source: "sector",
    filters: { radiusLy: "Search radius", padSize: "Landing pad", supercruise: "Supercruise limit" },
  },
  {
    id: "hazard_alerts",
    label: "Gotcha alerts",
    description: "Long supercruise approaches, planetary ports and factions in Lockdown.",
    category: "Universal",
    source: "journal",
    filters: { supercruise: "Supercruise limit" },
  },
  {
    id: "market_opportunities",
    label: "Local trade & bulk supply",
    description: "Top imports and exports, and bulk commodities, within your radius.",
    category: "Economy",
    source: "sector",
    filters: { radiusLy: "Search radius", fleetCarriers: "Fleet carriers" },
  },
  {
    id: "mining_reserves",
    label: "Mining rings & reserves",
    description: "Pristine and Major reserve systems with metallic and icy ring breakdowns.",
    category: "Exploration & Mining",
    source: "sector",
    filters: { radiusLy: "Search radius" },
  },
  {
    id: "combat_zones",
    label: "HazRES & conflict zones",
    description: "Resource extraction sites rich in bounties, and faction wars nearby.",
    category: "Combat",
    source: "sector",
    filters: { radiusLy: "Search radius" },
  },
];

/** Row order for a widget's query readout. */
export const FILTER_KEYS: readonly FilterKey[] = [
  "radiusLy",
  "padSize",
  "supercruise",
  "fleetCarriers",
];

export const DEFAULT_WIDGETS: Record<WidgetId, boolean> = {
  nearest_ports: true,
  material_traders: true,
  interstellar_factors: true,
  tech_brokers: false,
  hazard_alerts: true,
  market_opportunities: false,
  mining_reserves: false,
  combat_zones: false,
};
