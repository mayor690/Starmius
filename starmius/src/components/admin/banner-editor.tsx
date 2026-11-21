"use client";

import { BannerView } from "@/components/banner-view";
import {
  BANNER_PLACEMENT_LABELS, BANNER_TEMPLATES, BANNER_TONE_LABELS, BANNER_TYPE_LABELS, MAX_BANNERS, lagosToday,
} from "@/lib/banners";
import type { Banner, BannerPlacement, BannerTone, BannerType } from "@/lib/types";
import { ImageUploader } from "./image-uploader";
import { UtmHelper } from "./utm-helper";

const entries = <T extends string>(o: Record<T, string>) => Object.entries(o) as [T, string][];

export function BannerEditor({ value, onChange }: { value: Banner[]; onChange: (v: Banner[]) => void }) {
  const patch = (i: number, p: Partial<Banner>) => onChange(value.map((b, n) => (n === i ? { ...b, ...p } : b)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const n = [...value];
    [n[i], n[j]] = [n[j] as Banner, n[i] as Banner];
    onChange(n);
  };
  function add(type: BannerType) {
    let n = value.length + 1;
    while (value.some((b) => b.id === `banner-${n}`)) n++;
    onChange([...value, { id: `banner-${n}`, ...BANNER_TEMPLATES[type] }]);
  }
  const status = (b: Banner) => {
    if (!b.active) return "Off";
    const today = lagosToday();
    if (b.startsAt && today < b.startsAt) return `Scheduled from ${b.startsAt}`;
    if (b.endsAt && today > b.endsAt) return "Ended";
    return "Live";
  };

  return (
    <section>
      <h2 className="font-display text-3xl font-medium">Banners and promotions</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        Show adverts, promos and hot sales on your shop. The samples below are switched off. Turn one on, change the words and link, then save. Dates are optional and follow Nigeria time.
      </p>

      <ul className="mt-8 flex flex-col gap-8">
        {value.map((b, i) => {
          const live = status(b) === "Live";
          return (
            <li key={b.id} className="border border-champagne-300/60 bg-ivory-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.25em]">
                  <span className={live ? "text-emerald-800" : "text-muted"}>{status(b)}</span>
                  <span className="text-muted"> &middot; {BANNER_PLACEMENT_LABELS[b.placement]}</span>
                  {b.id.startsWith("sample-") && <span className="text-champagne-700"> &middot; Sample</span>}
                </p>
                <div className="flex items-center gap-5 text-xs font-medium uppercase tracking-[0.2em]">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-champagne-700 disabled:opacity-30" aria-label="Move up">&uarr;</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="text-champagne-700 disabled:opacity-30" aria-label="Move down">&darr;</button>
                  <button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))} className="text-red-800">Delete</button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden border border-champagne-300/40" aria-label="Preview">
                <BannerView banner={b} />
              </div>

              <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input type="checkbox" className="size-4 accent-[#6b4f2a]" checked={b.active} onChange={(e) => patch(i, { active: e.target.checked })} />
                    Show on the shop
                  </label>
                </div>
                <div>
                  <label className="field-label" htmlFor={`bt-${i}`}>Kind</label>
                  <select id={`bt-${i}`} className="field" value={b.type} onChange={(e) => patch(i, { type: e.target.value as BannerType })}>
                    {entries(BANNER_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor={`bp-${i}`}>Where it shows</label>
                  <select id={`bp-${i}`} className="field" value={b.placement} onChange={(e) => patch(i, { placement: e.target.value as BannerPlacement })}>
                    {entries(BANNER_PLACEMENT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor={`bh-${i}`}>Headline</label>
                  <input id={`bh-${i}`} required maxLength={80} className="field" value={b.title} onChange={(e) => patch(i, { title: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor={`bx-${i}`}>Short text (optional)</label>
                  <input id={`bx-${i}`} maxLength={200} className="field" value={b.text ?? ""} onChange={(e) => patch(i, { text: e.target.value })} />
                </div>
                <div>
                  <label className="field-label" htmlFor={`ba-${i}`}>Advertiser (optional)</label>
                  <input id={`ba-${i}`} maxLength={60} className="field" placeholder="Another business paying for this space" value={b.advertiser ?? ""} onChange={(e) => patch(i, { advertiser: e.target.value })} />
                  <p className="mt-1 text-xs text-muted">Shows to visitors as &quot;Sponsored by ...&quot;. Use a full https:// link below.</p>
                </div>
                <div>
                  <label className="field-label" htmlFor={`bp2-${i}`}>Amount they paid (NGN, optional)</label>
                  <input id={`bp2-${i}`} type="number" min={0} step={1} className="field" value={b.adRevenueNGN ?? ""} onChange={(e) => patch(i, { adRevenueNGN: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  <p className="mt-1 text-xs text-muted">Only for your Stats page. Visitors never see it.</p>
                </div>
                <div>
                  <label className="field-label" htmlFor={`bb-${i}`}>Label (optional)</label>
                  <input id={`bb-${i}`} maxLength={20} className="field" placeholder={BANNER_TYPE_LABELS[b.type]} value={b.badge ?? ""} onChange={(e) => patch(i, { badge: e.target.value })} />
                  <p className="mt-1 text-xs text-muted">Small tag, such as &quot;Hot sale&quot; or &quot;-20%&quot;.</p>
                </div>
                <div>
                  <label className="field-label" htmlFor={`bc-${i}`}>Colour</label>
                  <select id={`bc-${i}`} className="field" value={b.tone} onChange={(e) => patch(i, { tone: e.target.value as BannerTone })}>
                    {entries(BANNER_TONE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor={`bl-${i}`}>Button text (optional)</label>
                  <input id={`bl-${i}`} maxLength={30} className="field" value={b.ctaLabel ?? ""} onChange={(e) => patch(i, { ctaLabel: e.target.value })} />
                </div>
                <div>
                  <label className="field-label" htmlFor={`bk-${i}`}>Button link</label>
                  <input id={`bk-${i}`} className="field" placeholder="/shop or /shop?category=enlargements" value={b.ctaHref ?? ""} onChange={(e) => patch(i, { ctaHref: e.target.value })} />
                  <p className="mt-1 text-xs text-muted">A page on your site, or a full https:// link.</p>
                </div>
                <div className="sm:col-span-2">
                  <UtmHelper banner={b} onLink={(href) => patch(i, { ctaHref: href })} />
                </div>
                <div>
                  <label className="field-label" htmlFor={`bs-${i}`}>Starts (optional)</label>
                  <input id={`bs-${i}`} type="date" className="field" value={b.startsAt ?? ""} onChange={(e) => patch(i, { startsAt: e.target.value })} />
                </div>
                <div>
                  <label className="field-label" htmlFor={`be-${i}`}>Ends (optional)</label>
                  <input id={`be-${i}`} type="date" className="field" value={b.endsAt ?? ""} onChange={(e) => patch(i, { endsAt: e.target.value })} />
                </div>
                <div>
                  <ImageUploader images={b.itemImages ?? []} max={4} label="Item photos (optional, up to 4)" hint="Product or item pictures beside the text. Add 2 to 4 to make a carousel with dots." onChange={(imgs) => patch(i, { itemImages: imgs })} />
                </div>
                <div>
                  <ImageUploader images={b.image ? [b.image] : []} max={1} label="Background photo (optional)" hint="Wide photos work best. Text is placed over it." onChange={(imgs) => patch(i, { image: imgs[0] ?? "" })} />
                </div>
              </div>
            </li>
          );
        })}
        {!value.length && <li className="text-sm text-muted">No banners yet. Add one below.</li>}
      </ul>

      <div className="mt-8 flex flex-wrap gap-4">
        {entries(BANNER_TYPE_LABELS).map(([k, l]) => (
          <button key={k} type="button" className="btn btn-outline" disabled={value.length >= MAX_BANNERS} onClick={() => add(k)}>Add {l.toLowerCase()}</button>
        ))}
      </div>
    </section>
  );
}
