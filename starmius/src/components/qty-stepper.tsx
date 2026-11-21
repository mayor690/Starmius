"use client";

import { site } from "@/data/site";

export function QtyStepper({ value, onChange, label, max = site.maxQty }: { value: number; onChange: (n: number) => void; label: string; max?: number }) {
  return (
    <div className="inline-flex items-center border border-champagne-300/70" role="group" aria-label={label}>
      <button type="button" className="size-10 text-lg text-ink transition-colors hover:text-champagne-700 disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">-</button>
      <span className="w-8 text-center text-sm" aria-live="polite">{value}</span>
      <button type="button" className="size-10 text-lg text-ink transition-colors hover:text-champagne-700 disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">+</button>
    </div>
  );
}
