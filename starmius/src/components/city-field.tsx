"use client";

import { useState } from "react";
import { LOCATIONS } from "@/data/locations";
import { OUTSIDE_NIGERIA } from "@/lib/shipping";

const OTHER = "__other";

/** City / town picker that follows the chosen state, with a typed fallback for places not listed. */
export function CityField({ id, state, value, onChange, autoComplete }: { id: string; state: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  const [typing, setTyping] = useState(false);
  const places = state ? LOCATIONS[state] : undefined;

  // No list for this state (not chosen yet, or outside Nigeria): plain text.
  if (!places) {
    return (
      <input id={id} name={id} required className="field" autoComplete={autoComplete} value={value}
        disabled={!state} placeholder={state === OUTSIDE_NIGERIA ? "City" : "Select your state first"} onChange={(e) => onChange(e.target.value)} />
    );
  }

  const known = places.towns.includes(value) || places.lgas.includes(value);
  const selected = typing || (value !== "" && !known) ? OTHER : value;

  return (
    <div className="flex flex-col gap-3">
      <select id={id} name={id} required={!typing} className="field" autoComplete={autoComplete} value={selected}
        onChange={(e) => {
          if (e.target.value === OTHER) { setTyping(true); onChange(""); } else { setTyping(false); onChange(e.target.value); }
        }}>
        <option value="" disabled>Select your city or town</option>
        <optgroup label="Cities and towns">{places.towns.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>
        <optgroup label="Local governments (LGAs)">{places.lgas.map((l) => <option key={l} value={l}>{l}</option>)}</optgroup>
        <option value={OTHER}>Other (type it)</option>
      </select>
      {selected === OTHER && (
        <input aria-label="Your city or town" required className="field" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type your city or town" autoFocus />
      )}
    </div>
  );
}
