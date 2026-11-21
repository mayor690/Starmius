"use client";

import { useState, type FormEvent } from "react";
import { PHONE } from "@/data/contact";
import { adminApi } from "@/lib/admin-api";
import { BannerEditor } from "./banner-editor";
import { ShippingEditor } from "./shipping-editor";
import type { InfoBlock, SiteSettings, SocialLink } from "@/lib/types";

const ICONS = ["x", "telegram", "instagram", "facebook", "tiktok", "whatsapp", "youtube", "link"];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

function BlockEditor({ title, value, onChange }: { title: string; value: InfoBlock | null; onChange: (v: InfoBlock | null) => void }) {
  const v = value ?? { label: "", lines: [] };
  const update = (label: string, lines: string) => onChange(label || lines ? { label, lines: lines.split("\n") } : null);
  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
      <div>
        <label className="field-label" htmlFor={`${title}-l`}>{title} heading</label>
        <input id={`${title}-l`} className="field" value={v.label} onChange={(e) => update(e.target.value, v.lines.join("\n"))} />
      </div>
      <div>
        <label className="field-label" htmlFor={`${title}-t`}>{title} lines (one per line, leave empty to hide)</label>
        <textarea id={`${title}-t`} rows={2} className="field resize-none" value={v.lines.join("\n")} onChange={(e) => update(v.label, e.target.value)} />
      </div>
    </div>
  );
}

export function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const patchSocial = (i: number, p: Partial<SocialLink>) => setS((x) => ({ ...x, socials: x.socials.map((o, n) => (n === i ? { ...o, ...p } : o)) }));

  function addSocial() {
    let id = "social";
    for (let n = 2; s.socials.some((o) => o.id === id); n++) id = `social-${n}`;
    setS({ ...s, socials: [...s.socials, { id, label: "", url: "https://", icon: "link", showInFooter: true, showInContact: true }] });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const socials = s.socials.map((o) => (o.id.startsWith("social") && o.label ? { ...o, id: slugify(o.label) || o.id } : o));
      const res = await adminApi<{ settings: SiteSettings }>("/api/admin/site", "PUT", { ...s, socials });
      setS(res.settings);
      setNotice("Saved. Changes are live on the shop.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-12">
      <section className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
        <h2 className="font-display text-3xl font-medium sm:col-span-2">Contact details</h2>
        <div>
          <label className="field-label" htmlFor="phone">Phone (fixed)</label>
          <input id="phone" className="field opacity-70" value={PHONE} readOnly aria-readonly="true" />
          <p className="mt-1 text-xs text-muted">The phone number cannot be changed from the dashboard.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="field" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} />
        </div>
        <div>
          <label className="field-label" htmlFor="handle">Brand handle</label>
          <input id="handle" className="field" value={s.brandHandle} onChange={(e) => setS({ ...s, brandHandle: e.target.value })} />
        </div>
        <div className="flex flex-col gap-7 sm:col-span-2">
          <BlockEditor title="Address" value={s.address} onChange={(address) => setS({ ...s, address })} />
          <BlockEditor title="Hours" value={s.hours} onChange={(hours) => setS({ ...s, hours })} />
        </div>
      </section>

      <BannerEditor value={s.banners} onChange={(banners) => setS({ ...s, banners })} />

      <ShippingEditor value={s.shipping} onChange={(shipping) => setS({ ...s, shipping })} />

      <section className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <h2 className="font-display text-3xl font-medium sm:col-span-2">Picture carousels</h2>
        <div>
          <label className="field-label" htmlFor="carousel">Seconds between pictures</label>
          <input id="carousel" type="number" min={0} max={30} className="field" value={s.carouselSeconds} onChange={(e) => setS({ ...s, carouselSeconds: Number(e.target.value) })} />
        </div>
        <p className="self-end text-xs leading-relaxed text-muted">Applies to every carousel: products, hot sale, promo and pop-up cards. Use 2 to 30 seconds, or 0 to turn auto-advance off (the dots still work). It pauses while a visitor hovers over a card.</p>
      </section>

      <section className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <h2 className="font-display text-3xl font-medium sm:col-span-2">Stock</h2>
        <div>
          <label className="field-label" htmlFor="lowstock">Show &quot;Only N left&quot; at or below</label>
          <input id="lowstock" type="number" min={0} max={1000} className="field" value={s.lowStockThreshold} onChange={(e) => setS({ ...s, lowStockThreshold: Number(e.target.value) })} />
        </div>
        <p className="self-end text-xs leading-relaxed text-muted">Applies to products with an item count. Set each product&apos;s count under Products. At 0 left, a product shows as out of stock, is dimmed on the shop and cannot be bought.</p>
      </section>

      <section>
        <h2 className="font-display text-3xl font-medium">Social links</h2>
        <p className="mt-2 text-sm text-muted">The WhatsApp link (https://wa.me/234...) is where every order&apos;s details are sent, so it must stay.</p>
        <ul className="mt-6 flex flex-col gap-5">
          {s.socials.map((o, i) => {
            const locked = o.id === "whatsapp";
            return (
              <li key={o.id} className="grid gap-4 border border-champagne-300/60 bg-ivory-50 p-5 sm:grid-cols-[1fr_1fr_2fr]">
                <div>
                  <label className="field-label" htmlFor={`sl-${i}`}>Name</label>
                  <input id={`sl-${i}`} className="field" required value={o.label} onChange={(e) => patchSocial(i, { label: e.target.value })} />
                </div>
                <div>
                  <label className="field-label" htmlFor={`sh-${i}`}>Handle</label>
                  <input id={`sh-${i}`} className="field" value={o.handle ?? ""} onChange={(e) => patchSocial(i, { handle: e.target.value })} />
                </div>
                <div>
                  <label className="field-label" htmlFor={`su-${i}`}>Link</label>
                  <input id={`su-${i}`} type="url" required className="field" value={o.url} onChange={(e) => patchSocial(i, { url: e.target.value })} />
                </div>
                <div>
                  <label className="field-label" htmlFor={`si-${i}`}>Icon</label>
                  <select id={`si-${i}`} className="field" value={o.icon} onChange={(e) => patchSocial(i, { icon: e.target.value })}>
                    {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
                <div className="flex flex-wrap items-end gap-6 text-sm sm:col-span-2">
                  <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#6b4f2a]" checked={o.showInFooter !== false} onChange={(e) => patchSocial(i, { showInFooter: e.target.checked })} />Footer</label>
                  <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#6b4f2a]" checked={o.showInContact !== false} onChange={(e) => patchSocial(i, { showInContact: e.target.checked })} />Contact page</label>
                  <button type="button" disabled={locked} onClick={() => setS({ ...s, socials: s.socials.filter((_, n) => n !== i) })} className="ml-auto text-xs font-medium uppercase tracking-[0.2em] text-red-800 disabled:opacity-30">Remove</button>
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn btn-outline mt-6" onClick={addSocial}>Add social link</button>
      </section>

      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="text-sm text-champagne-700">{notice}</p>}
      <div><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving" : "Save changes"}</button></div>
    </form>
  );
}
