import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isThemeId, SETTINGS_STORAGE_KEY, type ThemeId } from "@/lib/storage-keys";
import { DEFAULT_CARD_ORDER, isDefaultCardOrder, sanitiseCardOrder, type CardId } from "@/lib/card-order";
import {
  DEFAULT_DARK_COLOUR,
  isDarkColour,
  systemPrefersLight,
  themeForNewVisitor,
  toggledTheme,
  type DarkColour,
} from "@/lib/theme";
import {
  BUILT_IN_PROFILES,
  effectiveProfile,
  isWidgetEnabled,
  newProfileId,
  type EffectiveProfile,
  type PadFilter,
  type Profile,
  type ProfileConfig,
  type ProfileExport,
} from "@/lib/profiles";
import { WIDGETS, type WidgetId } from "@/lib/widgets";

/** Bump when the persisted shape changes and add a migration in `persist`. */
export const SETTINGS_VERSION = 1;

/** What is kept between visits. There is no account: it lives in this browser only. */
export interface PersistedSettings {
  /** Light, or one of the three dark colours. */
  theme: ThemeId;
  /** The dark colour to go back to when leaving light mode. */
  darkColour: DarkColour;
  /** The order the player dragged the dashboard cards into. */
  cardOrder: CardId[];
  /**
   * Whether the player has ever picked a theme. Until they do, the theme follows the
   * system's own light or dark setting, visit after visit.
   */
  themeChosen: boolean;
  activeProfileId: string;
  profiles: Profile[];
  overrides: Record<string, Partial<ProfileConfig>>;
  pinnedWidgets: WidgetId[];
}

interface SettingsActions {
  /** The player picked a theme. From here on, their choice stands. */
  chooseTheme: (theme: ThemeId) => void;
  /** Take the system's light or dark setting, without counting it as a choice. */
  followSystemTheme: () => void;
  /** The sun and moon button: swap between light mode and the last dark colour. */
  toggleLightDark: () => void;
  setCardOrder: (order: CardId[]) => void;
  resetCardOrder: () => void;
  selectProfile: (profileId: string) => void;
  /** Change part of the active profile. A built-in preset keeps the change as a tweak. */
  updateConfig: (patch: Partial<ProfileConfig>) => void;
  /** Drop every tweak made to the active built-in preset. */
  resetProfile: () => void;
  /** Turn a widget on or off. Turning off a pinned widget unpins it. */
  toggleWidget: (id: WidgetId) => void;
  togglePin: (id: WidgetId) => void;
  /** Save the active profile, tweaks included, under a new name. Returns its id. */
  saveAsCustomProfile: (name: string) => string;
  deleteProfile: (profileId: string) => void;
  /** Add a profile shared by another player and make it active. Returns its id. */
  importProfile: (data: ProfileExport) => string;
}

export type SettingsState = PersistedSettings & SettingsActions;

export const DEFAULT_SETTINGS: PersistedSettings = {
  theme: DEFAULT_DARK_COLOUR,
  darkColour: DEFAULT_DARK_COLOUR,
  cardOrder: [...DEFAULT_CARD_ORDER],
  themeChosen: false,
  activeProfileId: BUILT_IN_PROFILES[0].id,
  profiles: [...BUILT_IN_PROFILES],
  overrides: {},
  pinnedWidgets: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const WIDGET_IDS = new Set<string>(WIDGETS.map((widget) => widget.id));
const BUILT_IN_IDS = new Set<string>(BUILT_IN_PROFILES.map((profile) => profile.id));
const PAD_FILTERS: readonly PadFilter[] = ["auto", "any", "medium", "large"];

function isPadFilter(value: unknown): value is PadFilter {
  return typeof value === "string" && (PAD_FILTERS as readonly string[]).includes(value);
}

function sanitizeEnabledWidgets(value: unknown): Record<WidgetId, boolean> {
  const widgets = {} as Record<WidgetId, boolean>;
  const raw = isRecord(value) ? value : {};
  for (const { id } of WIDGETS) {
    widgets[id] = raw[id] === true;
  }
  return widgets;
}

function isCustomProfile(value: unknown): value is Profile {
  if (!isRecord(value) || typeof value.id !== "string" || BUILT_IN_IDS.has(value.id)) {
    return false;
  }
  return (
    typeof value.name === "string" &&
    value.name.trim() !== "" &&
    typeof value.radiusLy === "number" &&
    typeof value.maxSupercruiseLs === "number" &&
    isPadFilter(value.padFilter) &&
    typeof value.excludeFleetCarriers === "boolean"
  );
}

/**
 * Check what was stored in the browser before it is used. Anything missing or broken
 * falls back to its default, and built-in presets always come from the current code so
 * a preset that changed in an update reaches the player.
 */
export function sanitizeSettings(persisted: unknown): PersistedSettings {
  if (!isRecord(persisted)) {
    return DEFAULT_SETTINGS;
  }
  const customProfiles = Array.isArray(persisted.profiles)
    ? persisted.profiles.filter(isCustomProfile).map(
        (profile): Profile => ({
          ...profile,
          builtIn: false,
          blurb: typeof profile.blurb === "string" ? profile.blurb : "",
          enabledWidgets: sanitizeEnabledWidgets(profile.enabledWidgets),
        }),
      )
    : [];
  const profiles = [...BUILT_IN_PROFILES, ...customProfiles];

  const rawOverrides = isRecord(persisted.overrides) ? persisted.overrides : {};
  const overrides: Record<string, Partial<ProfileConfig>> = {};
  for (const preset of BUILT_IN_PROFILES) {
    const override = rawOverrides[preset.id];
    if (!isRecord(override) || Object.keys(override).length === 0) {
      continue;
    }
    overrides[preset.id] = {
      ...(typeof override.radiusLy === "number" ? { radiusLy: override.radiusLy } : {}),
      ...(typeof override.maxSupercruiseLs === "number"
        ? { maxSupercruiseLs: override.maxSupercruiseLs }
        : {}),
      ...(isPadFilter(override.padFilter) ? { padFilter: override.padFilter } : {}),
      ...(typeof override.excludeFleetCarriers === "boolean"
        ? { excludeFleetCarriers: override.excludeFleetCarriers }
        : {}),
      ...(isRecord(override.enabledWidgets)
        ? { enabledWidgets: sanitizeEnabledWidgets(override.enabledWidgets) }
        : {}),
    };
    // Nothing survived the check: the preset is back to stock.
    if (Object.keys(overrides[preset.id]).length === 0) {
      delete overrides[preset.id];
    }
  }

  const theme = isThemeId(persisted.theme) ? persisted.theme : DEFAULT_SETTINGS.theme;

  return {
    theme,
    // A stored colour that is missing or broken falls back to the theme itself when that is dark.
    darkColour: isDarkColour(persisted.darkColour)
      ? persisted.darkColour
      : isDarkColour(theme)
        ? theme
        : DEFAULT_SETTINGS.darkColour,
    cardOrder: sanitiseCardOrder(persisted.cardOrder),
    // Settings stored before this was recorded carry no flag. For those, a theme other
    // than the default was picked; for everything else the flag itself is believed.
    themeChosen:
      typeof persisted.themeChosen === "boolean"
        ? persisted.themeChosen
        : isThemeId(persisted.theme) && persisted.theme !== DEFAULT_SETTINGS.theme,
    activeProfileId:
      typeof persisted.activeProfileId === "string" &&
      profiles.some((profile) => profile.id === persisted.activeProfileId)
        ? persisted.activeProfileId
        : DEFAULT_SETTINGS.activeProfileId,
    profiles,
    overrides,
    pinnedWidgets: Array.isArray(persisted.pinnedWidgets)
      ? persisted.pinnedWidgets.filter((id): id is WidgetId => typeof id === "string" && WIDGET_IDS.has(id))
      : [],
  };
}

function activeProfileOf(state: PersistedSettings): Profile {
  return state.profiles.find((profile) => profile.id === state.activeProfileId) ?? state.profiles[0];
}

function withEnabledWidgets(
  base: Record<WidgetId, boolean>,
  patch: Partial<ProfileConfig> | undefined,
  change: (enabled: Record<WidgetId, boolean>) => Record<WidgetId, boolean>,
): Record<WidgetId, boolean> {
  return change({ ...base, ...patch?.enabledWidgets });
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      // Choosing a colour is also choosing dark mode, and it is the colour light mode comes back to.
      chooseTheme: (theme) =>
        set(isDarkColour(theme) ? { theme, darkColour: theme, themeChosen: true } : { theme, themeChosen: true }),

      followSystemTheme: () => set({ theme: themeForNewVisitor(systemPrefersLight()) }),

      toggleLightDark: () => {
        const { theme, darkColour } = get();
        set({ theme: toggledTheme(theme, darkColour), themeChosen: true });
      },

      setCardOrder: (cardOrder) => set({ cardOrder }),

      resetCardOrder: () => {
        if (!isDefaultCardOrder(get().cardOrder)) {
          set({ cardOrder: [...DEFAULT_CARD_ORDER] });
        }
      },

      selectProfile: (profileId) => {
        if (get().profiles.some((profile) => profile.id === profileId)) {
          set({ activeProfileId: profileId });
        }
      },

      updateConfig: (patch) =>
        set((state) => {
          const active = activeProfileOf(state);
          if (active.builtIn) {
            const previous = state.overrides[active.id];
            return {
              overrides: {
                ...state.overrides,
                [active.id]: {
                  ...previous,
                  ...patch,
                  enabledWidgets: withEnabledWidgets(active.enabledWidgets, previous, (all) => ({
                    ...all,
                    ...patch.enabledWidgets,
                  })),
                },
              },
            };
          }
          return {
            profiles: state.profiles.map((profile) =>
              profile.id === active.id
                ? {
                    ...profile,
                    ...patch,
                    enabledWidgets: withEnabledWidgets(profile.enabledWidgets, undefined, (all) => ({
                      ...all,
                      ...patch.enabledWidgets,
                    })),
                  }
                : profile,
            ),
          };
        }),

      resetProfile: () =>
        set((state) => {
          const active = activeProfileOf(state);
          if (!(active.id in state.overrides)) {
            return state;
          }
          const overrides = { ...state.overrides };
          delete overrides[active.id];
          return { overrides };
        }),

      toggleWidget: (id) => {
        const state = get();
        const active = activeProfileOf(state);
        const enabled = isWidgetEnabled(
          effectiveProfile(active, state.overrides[active.id], state.pinnedWidgets),
          id,
        );
        state.updateConfig({
          enabledWidgets: { [id]: !enabled } as Record<WidgetId, boolean>,
        });
        // A pinned widget is always on, so switching it off has to drop the pin too.
        if (enabled && state.pinnedWidgets.includes(id)) {
          set({ pinnedWidgets: state.pinnedWidgets.filter((pinned) => pinned !== id) });
        }
      },

      togglePin: (id) =>
        set((state) => ({
          pinnedWidgets: state.pinnedWidgets.includes(id)
            ? state.pinnedWidgets.filter((pinned) => pinned !== id)
            : [...state.pinnedWidgets, id],
        })),

      saveAsCustomProfile: (name) => {
        const state = get();
        const active = activeProfileOf(state);
        const effective = effectiveProfile(active, state.overrides[active.id], state.pinnedWidgets);
        const id = newProfileId();
        const profile: Profile = {
          id,
          name: name.trim().slice(0, 60) || "Custom profile",
          blurb: "Your own profile.",
          builtIn: false,
          radiusLy: effective.radiusLy,
          maxSupercruiseLs: effective.maxSupercruiseLs,
          padFilter: effective.padFilter,
          excludeFleetCarriers: effective.excludeFleetCarriers,
          enabledWidgets: { ...effective.enabledWidgets },
        };
        const overrides = { ...state.overrides };
        // The tweaks now live in the new profile; the preset goes back to stock.
        delete overrides[active.id];
        set({ profiles: [...state.profiles, profile], activeProfileId: id, overrides });
        return id;
      },

      deleteProfile: (profileId) =>
        set((state) => {
          const target = state.profiles.find((profile) => profile.id === profileId);
          if (!target || target.builtIn) {
            return state;
          }
          const profiles = state.profiles.filter((profile) => profile.id !== profileId);
          const overrides = { ...state.overrides };
          delete overrides[profileId];
          return {
            profiles,
            overrides,
            activeProfileId:
              state.activeProfileId === profileId ? profiles[0].id : state.activeProfileId,
          };
        }),

      importProfile: (data) => {
        const id = newProfileId();
        const profile: Profile = {
          id,
          name: data.name,
          blurb: "Imported from a shared profile file.",
          builtIn: false,
          radiusLy: data.radiusLy,
          maxSupercruiseLs: data.maxSupercruiseLs,
          padFilter: data.padFilter,
          excludeFleetCarriers: data.excludeFleetCarriers,
          enabledWidgets: { ...data.enabledWidgets },
        };
        set((state) => ({
          profiles: [...state.profiles, profile],
          activeProfileId: id,
          // Pins are the player's own; a shared file can add to them, never remove them.
          pinnedWidgets: [...new Set([...state.pinnedWidgets, ...data.pinnedWidgets])],
        }));
        return id;
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Hydration is triggered after mount so the first client render matches the server.
      skipHydration: true,
      partialize: ({ theme, darkColour, cardOrder, themeChosen, activeProfileId, profiles, overrides, pinnedWidgets }) => ({
        theme,
        darkColour,
        cardOrder,
        themeChosen,
        activeProfileId,
        profiles,
        overrides,
        pinnedWidgets,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitizeSettings(persisted) }),
    },
  ),
);

/** The active profile with the player's tweaks and pins applied. */
export function useEffectiveProfile(): EffectiveProfile {
  const activeProfile = useSettingsStore((state) => activeProfileOf(state));
  const override = useSettingsStore((state) => state.overrides[activeProfile.id]);
  const pinnedWidgets = useSettingsStore((state) => state.pinnedWidgets);
  return useMemo(
    () => effectiveProfile(activeProfile, override, pinnedWidgets),
    [activeProfile, override, pinnedWidgets],
  );
}

/** The theme as it stands, whether it was chosen, and the ways to change it. */
export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);
  const darkColour = useSettingsStore((state) => state.darkColour);
  const themeChosen = useSettingsStore((state) => state.themeChosen);
  const chooseTheme = useSettingsStore((state) => state.chooseTheme);
  const toggleLightDark = useSettingsStore((state) => state.toggleLightDark);
  const followSystemTheme = useSettingsStore((state) => state.followSystemTheme);
  return useMemo(
    () => ({ theme, darkColour, themeChosen, chooseTheme, toggleLightDark, followSystemTheme }),
    [theme, darkColour, themeChosen, chooseTheme, toggleLightDark, followSystemTheme],
  );
}
