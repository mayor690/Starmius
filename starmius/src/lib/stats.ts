import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isLive, lagosToday } from "./banners";
import { priceCart } from "./pricing";
import { DATA_DIR, getAllProducts, getSettings } from "./store";

/**
 * Privacy-friendly site stats, kept in DATA_DIR/stats.json.
 * No cookies and no personal data: visitors are counted from a daily-salted hash of a random id,
 * and orders keep only the reference, amount, items and the delivery state and city.
 */

const FILE = path.join(DATA_DIR, "stats.json");
const KEEP_DAYS = 400;
const MAX_VISITORS_PER_DAY = 50_000;
const MAX_PATHS_PER_DAY = 200;

interface BannerDay { imp: number; clk: number }
interface Day {
  views: number;
  visitors: string[];
  paths: Record<string, number>;
  refs: Record<string, number>;
  devices: Record<string, number>;
  banners: Record<string, BannerDay>;
  funnel: { atc: number; co: number; usdc: number };
}
export interface OrderRecord {
  ref: string;
  at: string;
  day: string;
  amountNGN: number;
  shippingNGN: number;
  state: string;
  city: string;
  items: { slug: string; name: string; qty: number; lineNGN: number }[];
}
interface StatsFile { days: Record<string, Day>; orders: OrderRecord[] }

const emptyDay = (): Day => ({ views: 0, visitors: [], paths: {}, refs: {}, devices: {}, banners: {}, funnel: { atc: 0, co: 0, usdc: 0 } });

async function read(): Promise<StatsFile> {
  try {
    const f = JSON.parse(await fs.readFile(FILE, "utf8")) as Partial<StatsFile>;
    return { days: f.days ?? {}, orders: f.orders ?? [] };
  } catch {
    return { days: {}, orders: [] };
  }
}

async function write(f: StatsFile): Promise<void> {
  const cutoff = lagosToday(new Date(Date.now() - KEEP_DAYS * 86_400_000));
  for (const d of Object.keys(f.days)) if (d < cutoff) delete f.days[d];
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(f), "utf8");
  await fs.rename(tmp, FILE);
}

let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const inc = (o: Record<string, number>, k: string, cap = 100) => {
  if (k in o) o[k] = (o[k] ?? 0) + 1;
  else if (Object.keys(o).length < cap) o[k] = 1;
};

// ---- Recording ----------------------------------------------------------

export interface TrackBody { vid?: unknown; events?: unknown }
const PATH_OK = /^\/[a-zA-Z0-9\-_/]{0,78}$/;
const HOST_OK = /^[a-z0-9.-]{1,60}$/;

export async function recordEvents(body: TrackBody): Promise<void> {
  const vid = typeof body.vid === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.vid) ? body.vid : "";
  const events = (Array.isArray(body.events) ? body.events : []).slice(0, 20) as Record<string, unknown>[];
  if (!events.length) return;
  const known = new Set((await getSettings()).banners.map((b) => b.id));
  const day = lagosToday();

  await locked(async () => {
    const f = await read();
    const d = (f.days[day] ??= emptyDay());
    for (const e of events) {
      switch (e.t) {
        case "pv": {
          const p = typeof e.p === "string" ? e.p.replace(/\/+$/, "") || "/" : "";
          if (!PATH_OK.test(p)) break;
          d.views += 1;
          inc(d.paths, p, MAX_PATHS_PER_DAY);
          const ref = typeof e.r === "string" && HOST_OK.test(e.r.toLowerCase()) ? e.r.toLowerCase() : "direct";
          inc(d.refs, ref, 60);
          const w = Number(e.w);
          inc(d.devices, w > 0 && w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop", 3);
          if (vid && d.visitors.length < MAX_VISITORS_PER_DAY) {
            const h = createHmac("sha256", process.env.AUTH_SECRET || "starmius").update(`${day}|${vid}`).digest("hex").slice(0, 12);
            if (!d.visitors.includes(h)) d.visitors.push(h);
          }
          break;
        }
        case "imp":
        case "clk": {
          const id = typeof e.b === "string" ? e.b : "";
          if (!known.has(id)) break;
          const b = (d.banners[id] ??= { imp: 0, clk: 0 });
          if (e.t === "imp") b.imp += 1; else b.clk += 1;
          break;
        }
        case "atc": d.funnel.atc += 1; break;
        case "co": d.funnel.co += 1; break;
        case "usdc": d.funnel.usdc += 1; break;
      }
    }
    await write(f);
  });
}

/** Records one verified Paystack payment. Safe to call many times for the same reference. */
export async function recordPaidOrder(o: { ref: string; amountNGN: number; shippingNGN: number; state?: string; city?: string; items: { slug: string; qty: number }[]; at?: string }): Promise<void> {
  if (!o.ref || !(o.amountNGN > 0)) return;
  const [products, settings] = await Promise.all([getAllProducts(), getSettings()]);
  const priced = priceCart(o.items, products, settings.shipping, o.state, o.city);
  const at = o.at && !Number.isNaN(Date.parse(o.at)) ? new Date(o.at).toISOString() : new Date().toISOString();
  await locked(async () => {
    const f = await read();
    if (f.orders.some((x) => x.ref === o.ref)) return;
    f.orders.push({
      ref: o.ref, at, day: lagosToday(new Date(at)), amountNGN: Math.round(o.amountNGN), shippingNGN: Math.round(o.shippingNGN),
      state: (o.state ?? "").slice(0, 40), city: (o.city ?? "").slice(0, 80),
      items: priced.items.map((i) => ({ slug: i.product.slug, name: i.product.name, qty: i.qty, lineNGN: i.lineNGN })),
    });
    await write(f);
  });
}

// ---- Report -------------------------------------------------------------

const sortCounts = (o: Record<string, number>, n: number) =>
  Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));

export async function getReport(rangeDays: number) {
  const range = [7, 30, 90, 365].includes(rangeDays) ? rangeDays : 30;
  const [f, settings] = await Promise.all([read(), getSettings()]);

  const days: string[] = [];
  for (let i = range - 1; i >= 0; i--) days.push(lagosToday(new Date(Date.now() - i * 86_400_000)));
  const inRange = new Set(days);

  const paths: Record<string, number> = {};
  const refs: Record<string, number> = {};
  const devices: Record<string, number> = {};
  const adDay: Record<string, BannerDay> = {};
  const funnel = { atc: 0, co: 0, usdc: 0 };
  let views = 0;
  let visitors = 0;

  const orders = f.orders.filter((o) => inRange.has(o.day));
  const daily = days.map((day) => {
    const d = f.days[day];
    const dayOrders = orders.filter((o) => o.day === day);
    views += d?.views ?? 0;
    visitors += d?.visitors.length ?? 0;
    for (const [k, v] of Object.entries(d?.paths ?? {})) paths[k] = (paths[k] ?? 0) + v;
    for (const [k, v] of Object.entries(d?.refs ?? {})) refs[k] = (refs[k] ?? 0) + v;
    for (const [k, v] of Object.entries(d?.devices ?? {})) devices[k] = (devices[k] ?? 0) + v;
    for (const [k, v] of Object.entries(d?.banners ?? {})) {
      const a = (adDay[k] ??= { imp: 0, clk: 0 });
      a.imp += v.imp; a.clk += v.clk;
    }
    funnel.atc += d?.funnel.atc ?? 0; funnel.co += d?.funnel.co ?? 0; funnel.usdc += d?.funnel.usdc ?? 0;
    return { day, views: d?.views ?? 0, visitors: d?.visitors.length ?? 0, orders: dayOrders.length, revenueNGN: dayOrders.reduce((s, o) => s + o.amountNGN, 0) };
  });

  const revenueNGN = orders.reduce((s, o) => s + o.amountNGN, 0);
  const products: Record<string, { name: string; qty: number; revenueNGN: number }> = {};
  const byState: Record<string, { orders: number; revenueNGN: number }> = {};
  for (const o of orders) {
    for (const i of o.items) {
      const p = (products[i.slug] ??= { name: i.name, qty: 0, revenueNGN: 0 });
      p.qty += i.qty; p.revenueNGN += i.lineNGN;
    }
    const s = (byState[o.state || "Unknown"] ??= { orders: 0, revenueNGN: 0 });
    s.orders += 1; s.revenueNGN += o.amountNGN;
  }

  const ids = new Set([...settings.banners.map((b) => b.id), ...Object.keys(adDay)]);
  const ads = [...ids].map((id) => {
    const b = settings.banners.find((x) => x.id === id);
    const a = adDay[id] ?? { imp: 0, clk: 0 };
    const paid = b?.adRevenueNGN ?? 0;
    return {
      id, title: b?.title ?? "Removed banner", advertiser: b?.advertiser ?? "", placement: b?.placement ?? "", type: b?.type ?? "",
      status: !b ? "Removed" : isLive(b) ? "Live" : b.active ? "Not in dates" : "Off",
      imp: a.imp, clk: a.clk, ctr: a.imp ? a.clk / a.imp : 0, paidNGN: paid,
      cpm: a.imp && paid ? (paid / a.imp) * 1000 : 0, cpc: a.clk && paid ? paid / a.clk : 0,
    };
  }).sort((x, y) => y.imp - x.imp);

  const adRevenueNGN = settings.banners.reduce((s, b) => s + (b.adRevenueNGN ?? 0), 0);

  return {
    range, from: days[0], to: days[days.length - 1],
    totals: {
      views, visitors, orders: orders.length, revenueNGN, adRevenueNGN,
      aovNGN: orders.length ? Math.round(revenueNGN / orders.length) : 0,
      conversion: visitors ? orders.length / visitors : 0,
      adImpressions: ads.reduce((s, a) => s + a.imp, 0), adClicks: ads.reduce((s, a) => s + a.clk, 0),
    },
    funnel, daily, ads,
    topPages: sortCounts(paths, 10), referrers: sortCounts(refs, 8), devices: sortCounts(devices, 3),
    topProducts: Object.entries(products).map(([slug, p]) => ({ slug, ...p })).sort((a, b) => b.revenueNGN - a.revenueNGN).slice(0, 8),
    byState: Object.entries(byState).map(([state, s]) => ({ state, ...s })).sort((a, b) => b.revenueNGN - a.revenueNGN).slice(0, 8),
    recentOrders: [...orders].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10).map((o) => ({ ref: o.ref, at: o.at, amountNGN: o.amountNGN, state: o.state, city: o.city, items: o.items.reduce((s, i) => s + i.qty, 0) })),
  };
}
