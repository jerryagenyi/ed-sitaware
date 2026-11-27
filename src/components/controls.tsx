"use client";

import { useId, type ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "primary" | "danger";
  /** Square button for a single icon. Pair with `aria-label`. */
  icon?: boolean;
};

export function Button({ variant = "ghost", icon = false, className = "", type = "button", ...props }: ButtonProps) {
  const classes = ["btn", `btn--${variant}`, icon ? "btn--icon" : "", className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...props} />;
}

interface RangeControlProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** How the current value reads, e.g. "5,000 Ls". Read out instead of the raw number. */
  display: string;
  onChange: (value: number) => void;
}

export function RangeControl({ id, label, value, min, max, step, display, onChange }: RangeControlProps) {
  return (
    <div className="control">
      <label htmlFor={id} className="hud-label">
        {label}
      </label>
      <div className="control__row">
        <input
          id={id}
          type="range"
          className="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={display}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <output htmlFor={id} className="control__value hud-value">
          {display}
        </output>
      </div>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  /** Hide the label visually, for tight toolbars. It is still the group's name. */
  hideLabel?: boolean;
  options: readonly { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** A set of mutually exclusive choices, built on real radio buttons. */
export function Segmented<T extends string>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className="control">
      <legend className={hideLabel ? "sr-only" : "hud-label"}>{label}</legend>
      <div className="seg">
        {options.map((option) => (
          <label key={option.value} className="seg__option">
            <input
              type="radio"
              name={name}
              className="sr-only"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span title={option.hint}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="switch"
      onClick={() => onChange(!checked)}
    >
      <span className="switch__label">{label}</span>
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
    </button>
  );
}
