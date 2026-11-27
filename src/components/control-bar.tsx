"use client";

import { formatInt } from "@/lib/format";
import { RADIUS, SUPERCRUISE_STEPS } from "@/lib/profiles";
import { useSettingsStore, useEffectiveProfile } from "@/store/settings";
import { PAD_FILTERS } from "@/lib/profiles";
import { RangeControl, Segmented, Switch } from "@/components/controls";

/** The global tactical controls from the PRD: radius, pads, supercruise, carriers, profile. */
export function ControlBar() {
  const profile = useEffectiveProfile();
  const profiles = useSettingsStore((state) => state.profiles);
  const updateConfig = useSettingsStore((state) => state.updateConfig);
  const selectProfile = useSettingsStore((state) => state.selectProfile);

  const supercruiseIndex = Math.max(
    0,
    SUPERCRUISE_STEPS.findIndex((step) => step === profile.maxSupercruiseLs),
  );

  return (
    <section
      aria-label="Tactical controls"
      className="flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-line px-6 py-4"
    >
      <div className="w-full sm:w-auto sm:min-w-56 sm:flex-1 sm:max-w-xs">
        <RangeControl
          id="radius"
          label="Search radius"
          min={RADIUS.min}
          max={RADIUS.max}
          step={RADIUS.step}
          value={profile.radiusLy}
          display={`${profile.radiusLy} ly`}
          onChange={(radiusLy) => updateConfig({ radiusLy })}
        />
      </div>

      <div className="w-full sm:w-auto sm:min-w-56 sm:flex-1 sm:max-w-xs">
        <RangeControl
          id="supercruise"
          label="Supercruise limit"
          min={0}
          max={SUPERCRUISE_STEPS.length - 1}
          step={1}
          value={supercruiseIndex}
          display={`${formatInt(profile.maxSupercruiseLs)} Ls`}
          onChange={(index) =>
            updateConfig({ maxSupercruiseLs: SUPERCRUISE_STEPS[index] ?? profile.maxSupercruiseLs })
          }
        />
      </div>

      <Segmented
        label="Landing pad"
        options={PAD_FILTERS.map((filter) => ({
          value: filter.id,
          label: filter.short,
          hint: filter.label,
        }))}
        value={profile.padFilter}
        onChange={(padFilter) => updateConfig({ padFilter })}
      />

      <Switch
        checked={profile.excludeFleetCarriers}
        onChange={(excludeFleetCarriers) => updateConfig({ excludeFleetCarriers })}
        label="Exclude fleet carriers"
      />

      <div className="control w-full sm:w-auto sm:min-w-56">
        <label htmlFor="profile" className="hud-label">
          Profile
        </label>
        <div className="flex items-center gap-2">
          <select
            id="profile"
            className="select w-full"
            value={profile.id}
            onChange={(event) => selectProfile(event.target.value)}
          >
            {profiles.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
          {profile.modified && (
            <span className="badge badge--warn" title="You have tweaked this preset. Save it as a profile to keep the tweaks.">
              Tweaked
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
