"use client";

import { LOCATIONS, placesFor } from "@/data/locations";
import { NIGERIA_STATES, type CityRule, type ShippingConfig, type ShippingZone } from "@/lib/shipping";

const num = (v: string) => (v === "" ? 0 : Number(v));

export function ShippingEditor({ value, onChange }: { value: ShippingConfig; onChange: (v: ShippingConfig) => void }) {
  const patchZone = (i: number, p: Partial<ShippingZone>) => onChange({ ...value, zones: value.zones.map((z, n) => (n === i ? { ...z, ...p } : z)) });
  const owner = (state: string) => value.zones.findIndex((z) => z.states.includes(state));

  function addZone() {
    let id = "zone";
    for (let n = 2; value.zones.some((z) => z.id === id); n++) id = `zone-${n}`;
    onChange({ ...value, zones: [...value.zones, { id, name: "", states: [], feeNGN: 0, feeUSDC: 0 }] });
  }

  const patchRule = (i: number, p: Partial<CityRule>) => onChange({ ...value, cityRules: value.cityRules.map((r, n) => (n === i ? { ...r, ...p } : r)) });
  const addRule = () => onChange({ ...value, cityRules: [...value.cityRules, { state: "Edo", city: LOCATIONS.Edo?.towns[0] ?? "", feeNGN: 0, feeUSDC: 0 }] });

  function toggle(i: number, state: string) {
    const z = value.zones[i];
    if (!z) return;
    patchZone(i, { states: z.states.includes(state) ? z.states.filter((s) => s !== state) : [...z.states, state] });
  }

  return (
    <section>
      <h2 className="font-display text-3xl font-medium">Delivery fees</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Customers choose their state at checkout and pay the fee of the zone that includes it. Any state not in a zone, and &quot;Outside Nigeria&quot;, pays the default fee. Use 0 for free delivery.
      </p>

      <div className="mt-6 grid max-w-xl gap-x-8 gap-y-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="def-ngn">Default fee (NGN)</label>
          <input id="def-ngn" type="number" min={0} step={1} className="field" value={value.defaultNGN} onChange={(e) => onChange({ ...value, defaultNGN: num(e.target.value) })} />
        </div>
        <div>
          <label className="field-label" htmlFor="def-usdc">Default fee (USD)</label>
          <input id="def-usdc" type="number" min={0} step="any" className="field" value={value.defaultUSDC} onChange={(e) => onChange({ ...value, defaultUSDC: num(e.target.value) })} />
        </div>
      </div>

      <ul className="mt-8 flex flex-col gap-6">
        {value.zones.map((z, i) => (
          <li key={z.id} className="border border-champagne-300/60 bg-ivory-50 p-5">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <div>
                <label className="field-label" htmlFor={`z-n-${i}`}>Zone name</label>
                <input id={`z-n-${i}`} className="field" placeholder="e.g. Lagos" required value={z.name} onChange={(e) => patchZone(i, { name: e.target.value })} />
              </div>
              <div>
                <label className="field-label" htmlFor={`z-f-${i}`}>Fee (NGN)</label>
                <input id={`z-f-${i}`} type="number" min={0} step={1} className="field" value={z.feeNGN} onChange={(e) => patchZone(i, { feeNGN: num(e.target.value) })} />
              </div>
              <div>
                <label className="field-label" htmlFor={`z-u-${i}`}>Fee (USD)</label>
                <input id={`z-u-${i}`} type="number" min={0} step="any" className="field" value={z.feeUSDC} onChange={(e) => patchZone(i, { feeUSDC: num(e.target.value) })} />
              </div>
              <button type="button" className="self-end pb-2 text-xs font-medium uppercase tracking-[0.2em] text-red-800" onClick={() => onChange({ ...value, zones: value.zones.filter((_, n) => n !== i) })}>Remove</button>
            </div>
            <fieldset className="mt-5">
              <legend className="field-label">States in this zone ({z.states.length})</legend>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
                {NIGERIA_STATES.map((s) => {
                  const o = owner(s);
                  const takenElsewhere = o !== -1 && o !== i;
                  return (
                    <label key={s} className={`flex items-center gap-2 ${takenElsewhere ? "opacity-40" : ""}`} title={takenElsewhere ? `In ${value.zones[o]?.name || "another zone"}` : undefined}>
                      <input type="checkbox" className="accent-[#6b4f2a]" checked={z.states.includes(s)} disabled={takenElsewhere} onChange={() => toggle(i, s)} />
                      {s}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
        {!value.zones.length && <li className="text-sm text-muted">No zones yet. Every order pays the default fee.</li>}
      </ul>
      <button type="button" className="btn btn-outline mt-6" onClick={addZone}>Add zone</button>

      <h3 className="mt-14 font-display text-2xl font-medium">City and town fees</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Optional. Give a specific city, town or LGA its own fee, for example Benin City or Ekpoma. It overrides the zone and default fee for that place.
      </p>
      <ul className="mt-6 flex flex-col gap-4">
        {value.cityRules.map((r, i) => (
          <li key={`${r.state}-${r.city}-${i}`} className="grid gap-4 border border-champagne-300/60 bg-ivory-50 p-5 sm:grid-cols-[1fr_1.4fr_1fr_1fr_auto]">
            <div>
              <label className="field-label" htmlFor={`cr-s-${i}`}>State</label>
              <select id={`cr-s-${i}`} className="field" value={r.state} onChange={(e) => patchRule(i, { state: e.target.value, city: placesFor(e.target.value)[0] ?? "" })}>
                {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor={`cr-c-${i}`}>City / town</label>
              <select id={`cr-c-${i}`} className="field" value={r.city} onChange={(e) => patchRule(i, { city: e.target.value })}>
                <optgroup label="Cities and towns">{LOCATIONS[r.state]?.towns.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>
                <optgroup label="Local governments (LGAs)">{LOCATIONS[r.state]?.lgas.map((l) => <option key={l} value={l}>{l}</option>)}</optgroup>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor={`cr-n-${i}`}>Fee (NGN)</label>
              <input id={`cr-n-${i}`} type="number" min={0} step={1} className="field" value={r.feeNGN} onChange={(e) => patchRule(i, { feeNGN: num(e.target.value) })} />
            </div>
            <div>
              <label className="field-label" htmlFor={`cr-u-${i}`}>Fee (USD)</label>
              <input id={`cr-u-${i}`} type="number" min={0} step="any" className="field" value={r.feeUSDC} onChange={(e) => patchRule(i, { feeUSDC: num(e.target.value) })} />
            </div>
            <button type="button" className="self-end pb-2 text-xs font-medium uppercase tracking-[0.2em] text-red-800" onClick={() => onChange({ ...value, cityRules: value.cityRules.filter((_, n) => n !== i) })}>Remove</button>
          </li>
        ))}
        {!value.cityRules.length && <li className="text-sm text-muted">No city fees. Zones and the default fee apply.</li>}
      </ul>
      <button type="button" className="btn btn-outline mt-6" onClick={addRule}>Add city fee</button>
    </section>
  );
}
