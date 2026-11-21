"use client";

import { useState } from "react";
import { addUtm, hasUtm, removeUtm, slugTag } from "@/lib/utm";
import type { Banner } from "@/lib/types";

/** Builds a tagged link so the advertiser's own analytics can show visits that came from your banner. */
export function UtmHelper({ banner, onLink }: { banner: Banner; onLink: (href: string) => void }) {
  const href = banner.ctaHref ?? "";
  const external = href.startsWith("https://");
  const month = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }).slice(0, 7);
  const suggestion = slugTag(`${banner.advertiser || banner.title}-${month}`);
  const [campaign, setCampaign] = useState("");
  const value = campaign || suggestion;
  const tagged = hasUtm(href);
  const next = external ? addUtm(href, { source: "starmius", medium: "banner", campaign: value, content: banner.placement }) : null;

  if (!external) {
    return <p className="mt-2 text-xs text-muted">Tracking tags are for advertiser links that start with https://.</p>;
  }

  return (
    <div className="mt-3 border border-champagne-300/50 bg-ivory-100/60 p-3 text-xs">
      <p className="font-medium uppercase tracking-[0.2em]">Tracking tags {tagged && <span className="text-emerald-800">(added)</span>}</p>
      <p className="mt-1 leading-relaxed text-muted">
        Adds tags so the advertiser&apos;s own analytics can show visits from your banner. Share the link with them, so both of you can compare numbers.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="field-label" htmlFor={`utm-${banner.id}`}>Campaign name</label>
          <input id={`utm-${banner.id}`} className="field" value={campaign} placeholder={suggestion} onChange={(e) => setCampaign(e.target.value)} />
        </div>
        <button type="button" className="btn btn-outline !px-5 !py-3" disabled={!next} onClick={() => next && onLink(next)}>{tagged ? "Update tags" : "Add tags"}</button>
        {tagged && <button type="button" className="text-xs font-medium uppercase tracking-[0.2em] text-red-800" onClick={() => onLink(removeUtm(href))}>Remove</button>}
      </div>
      {next && !tagged && <p className="mt-3 break-all text-muted">Preview: {next}</p>}
    </div>
  );
}
