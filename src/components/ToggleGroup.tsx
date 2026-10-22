"use client";

import { CheckIcon } from "./icons";

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  /** Tailwind classes applied when the option is selected. */
  activeClass: string;
}

interface ToggleGroupProps<T extends string> {
  options: ToggleOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  ariaLabel: string;
}

/** Multi-select buttons: any combination (or none) can be on at the same time. */
export function ToggleGroup<T extends string>({ options, value, onChange, ariaLabel }: ToggleGroupProps<T>) {
  function toggle(option: T) {
    const next = value.includes(option) ? value.filter((v) => v !== option) : [...value, option];
    // Keep the original option order so the stored value is always consistent.
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)));
  }

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              on ? option.activeClass : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded border ${
                on ? "border-current bg-current/10" : "border-slate-300 bg-white"
              }`}
            >
              {on && <CheckIcon size={12} strokeWidth={3} />}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
