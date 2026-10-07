"use client";

import { Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** A labelled group of controls: a <fieldset> so the legend names the whole group. */
export function Group({ label, required, children }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

const choiceBase =
  "cursor-pointer rounded-lg border-[1.5px] border-input bg-card transition-colors has-checked:border-primary has-checked:bg-pink-pale has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

/** Single-choice options rendered as a row of pill buttons. */
export function SegmentGroup({ name, options, value, onChange, className }) {
  return (
    <div className={cn("flex flex-wrap gap-2.5", className)}>
      {options.map((option) => (
        <label
          key={option}
          className={cn(
            choiceBase,
            "has-checked:text-primary flex-1 px-2 py-3 text-center text-sm font-medium whitespace-nowrap has-checked:font-bold"
          )}
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="sr-only"
          />
          {option}
        </label>
      ))}
    </div>
  );
}

/** Single-choice options rendered as large cards with a radio dot. */
export function RadioCards({ name, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(choiceBase, "group flex flex-1 items-center gap-3 px-4 py-3.5 md:px-5 md:py-4")}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          <span
            aria-hidden="true"
            className="border-input group-has-checked:border-primary flex size-5 shrink-0 items-center justify-center rounded-full border-2"
          >
            <span className="bg-primary hidden size-2.5 rounded-full group-has-checked:block" />
          </span>
          <span className="text-[15px] font-medium">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Multi-select grid of toggle chips. */
export function ChipGrid({ options, selected, onToggle }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
      {options.map((option) => {
        const checked = selected.includes(option);
        return (
          <label
            key={option}
            className={cn(
              choiceBase,
              "text-body has-checked:text-primary flex items-center justify-center gap-1.5 px-3 py-2.5 text-center text-[13px] has-checked:font-semibold"
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(option)}
              className="sr-only"
            />
            {checked ? <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" /> : null}
            {option}
          </label>
        );
      })}
    </div>
  );
}

const PAIN_SCALE = Array.from({ length: 11 }, (_, n) => n);

export function PainSlider({ value, onChange }) {
  return (
    <div>
      <div className="mb-2 flex justify-between">
        <span className="text-muted-foreground text-xs">No pain</span>
        <span className="text-primary text-sm font-bold">{value}/10</span>
        <span className="text-muted-foreground text-xs">Severe</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Pain severity from 0 to 10"
        className="accent-primary h-6 w-full cursor-pointer"
      />
      <div className="mt-1 flex justify-between" aria-hidden="true">
        {PAIN_SCALE.map((n) => (
          <span
            key={n}
            className={cn(
              "text-[10px]",
              n <= value ? "text-primary" : "text-muted-foreground",
              n === value && "font-bold"
            )}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export function InfoBox({ children }) {
  return (
    <div className="border-gold-border border-l-gold bg-gold-light flex items-start gap-2.5 rounded-lg border border-l-[3px] px-4 py-3.5">
      <Info className="text-gold mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="text-gold-dark text-[13px] leading-relaxed italic">{children}</p>
    </div>
  );
}

export function ReviewSection({ title, rows }) {
  return (
    <section>
      <h3 className="text-muted-foreground mb-1 text-[13px] font-bold tracking-[1px] uppercase">
        {title}
      </h3>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b py-3.5">
            <dt className="text-muted-foreground shrink-0 text-sm">{label}</dt>
            <dd className="text-right text-sm font-semibold">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
