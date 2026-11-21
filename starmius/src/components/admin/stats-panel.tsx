"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { formatNGN } from "@/lib/format";
import { Bars, Card, Panel, Ranked, n0, pct } from "./stats-charts";

type Report = Awaited<ReturnType<typeof import("@/lib/stats").getReport>>;
const RANGES = [{ d: 7, l: "7 days" }, { d: 30, l: "30 days" }, { d: 90, l: "90 days" }, { d: 365, l: "1 year" }];

export function StatsPanel() {
  const [range, setRange] = useState(30);
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setError("");
    adminApi<Report>(`/api/admin/stats?range=${range}`, "GET").then((d) => { if (live) setR(d); }).catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [range]);

  if (error) return <p role="alert" className="text-sm text-red-800">{error}</p>;
  if (!r) return <p className="text-muted">Loading stats</p>;
  const t = r.totals;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-medium">Starmius stats</h2>
          <p className="mt-1 text-xs text-muted">{r.from} to {r.to} (Nigeria time). Your own visits while signed in are not counted.</p>
        </div>
        <div className="flex gap-5 text-xs font-medium uppercase tracking-[0.2em]" role="group" aria-label="Date range">
          {RANGES.map((x) => (
            <button key={x.d} type="button" onClick={() => setRange(x.d)} aria-pressed={range === x.d}
              className={`border-b pb-1 ${range === x.d ? "border-champagne-600 text-champagne-700" : "border-transparent text-muted hover:text-ink"}`}>{x.l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card label="Sales (paid in Naira)" value={formatNGN(t.revenueNGN)} sub={`${n0(t.orders)} orders, average ${formatNGN(t.aovNGN)}`} />
        <Card label="Ad income" value={formatNGN(t.adRevenueNGN)} sub="Amounts you entered on banners" />
        <Card label="Sales + ad income" value={formatNGN(t.revenueNGN + t.adRevenueNGN)} />
        <Card label="Orders per visitor" value={pct(t.conversion)} sub="Paid orders / visitors" />
        <Card label="Visitors" value={n0(t.visitors)} sub="Daily unique visitors added up" />
        <Card label="Page views" value={n0(t.views)} />
        <Card label="Ad impressions" value={n0(t.adImpressions)} />
        <Card label="Ad clicks" value={n0(t.adClicks)} sub={`Click rate ${pct(t.adImpressions ? t.adClicks / t.adImpressions : 0)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Page views per day"><Bars data={r.daily.map((d) => ({ label: d.day, value: d.views }))} /></Panel>
        <Panel title="Sales per day" note="Paid Naira orders"><Bars money data={r.daily.map((d) => ({ label: d.day, value: d.revenueNGN }))} /></Panel>
      </div>

      <Panel title="Ads and banners" note="Impressions count once per page view when a banner is at least half visible. Add what an advertiser paid on the banner to see cost per 1,000 views and per click.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-[0.65rem] uppercase tracking-[0.2em] text-muted">
              <tr><th className="py-2 pr-4">Banner</th><th className="pr-4">Status</th><th className="pr-4 text-right">Views</th><th className="pr-4 text-right">Clicks</th><th className="pr-4 text-right">CTR</th><th className="pr-4 text-right">Paid</th><th className="pr-4 text-right">Per 1,000</th><th className="text-right">Per click</th></tr>
            </thead>
            <tbody className="divide-y divide-champagne-300/40 tabular-nums">
              {r.ads.map((a) => (
                <tr key={a.id}>
                  <td className="py-3 pr-4"><span className="block font-medium">{a.title}</span><span className="text-xs text-muted">{a.advertiser ? `Sponsored by ${a.advertiser}` : "Your own"}{a.placement ? ` \u00b7 ${a.placement}` : ""}</span></td>
                  <td className="pr-4">{a.status}</td>
                  <td className="pr-4 text-right">{n0(a.imp)}</td><td className="pr-4 text-right">{n0(a.clk)}</td><td className="pr-4 text-right">{pct(a.ctr)}</td>
                  <td className="pr-4 text-right">{a.paidNGN ? formatNGN(a.paidNGN) : "-"}</td>
                  <td className="pr-4 text-right">{a.cpm ? formatNGN(a.cpm) : "-"}</td><td className="text-right">{a.cpc ? formatNGN(a.cpc) : "-"}</td>
                </tr>
              ))}
              {!r.ads.length && <tr><td colSpan={8} className="py-6 text-center text-muted">No banners yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Top pages"><Ranked rows={r.topPages.map((p) => ({ key: p.key, value: p.count }))} /></Panel>
        <Panel title="Where visitors come from"><Ranked rows={r.referrers.map((p) => ({ key: p.key, value: p.count }))} /></Panel>
        <Panel title="Devices"><Ranked rows={r.devices.map((p) => ({ key: p.key, value: p.count }))} /></Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Shopping steps" note="How many times each step happened in this period.">
          <Ranked rows={[
            { key: "Page views", value: t.views }, { key: "Added to cart", value: r.funnel.atc },
            { key: "Started Naira payment", value: r.funnel.co }, { key: "Paid orders", value: t.orders },
            { key: "Confirmed USDC or USDT on WhatsApp (not verified)", value: r.funnel.usdc },
          ]} />
        </Panel>
        <Panel title="Best sellers" note="By Naira sales, from paid orders">
          <Ranked empty="No paid orders in this period." rows={r.topProducts.map((p) => ({ key: `${p.name} (${p.qty})`, value: p.revenueNGN, label: formatNGN(p.revenueNGN) }))} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sales by state"><Ranked empty="No paid orders in this period." rows={r.byState.map((s) => ({ key: `${s.state} (${s.orders})`, value: s.revenueNGN, label: formatNGN(s.revenueNGN) }))} /></Panel>
        <Panel title="Recent paid orders">
          {r.recentOrders.length ? (
            <ul className="divide-y divide-champagne-300/40 text-sm">
              {r.recentOrders.map((o) => (
                <li key={o.ref} className="flex justify-between gap-4 py-2">
                  <span><span className="block tabular-nums">{o.ref}</span><span className="text-xs text-muted">{new Date(o.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })} &middot; {[o.city, o.state].filter(Boolean).join(", ") || "Unknown"} &middot; {o.items} item{o.items === 1 ? "" : "s"}</span></span>
                  <span className="font-display text-lg tabular-nums">{formatNGN(o.amountNGN)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No paid orders in this period.</p>}
        </Panel>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Sales come only from payments Paystack has confirmed. Add https://YOUR-SITE/api/paystack/webhook in your Paystack dashboard so every payment is counted, even when a customer closes the page. USDC payments are confirmed by hand, so they are not in the sales total.
      </p>
    </div>
  );
}
