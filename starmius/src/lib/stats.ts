import "server-only";
import { createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isLive, lagosToday } from "./banners";
import { priceCart } from "./pricing";
import { getAllProducts, getSettings } from "./store";
import { DATA_DIR, getDb, writeFileAtomic, type D1Database } from "./storage";

/**
 * Privacy-friendly site stats. Kept in DATA_DIR/stats.json locally, and in D1 tables on Cloudflare.
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
  funnel: { atc: number; co: number; usdc: number; bank: number };
}
export interface OrderRecord {
  ref: string;
  at: string;
  day: string;
  amountNGN: number;
  /** Crypto orders are counted in dollars. Their naira amount is 0. */
  amountUSD?: number;
  shippingNGN: number;
  state: string;
  city: string;
  items: { slug: string; name: string; qty: number; lineNGN: number }[];
  /** How it was paid. Older records have no value and were all Paystack. */
  method?: "paystack" | "bank" | "usdc" | "usdt";
}
interface StatsFile { days: Record<string, Day>; orders: OrderRecord[] }

const emptyDay = (): Day => ({ views: 0, visitors: [], paths: {}, refs: {}, devices: {}, banners: {}, funnel: { atc: 0, co: 0, usdc: 0, bank: 0 } });

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
  await writeFileAtomic(FILE, JSON.stringify(f));
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

/** What one batch of events adds up to, already checked. Applied to files or to D1. */
interface Ops {
  paths: string[]; refs: string[]; devices: string[];
  visitor?: string;
  banners: { id: string; kind: "imp" | "clk" }[];
  funnel: { atc: number; co: number; usdc: number; bank: number };
}

function normalise(events: Record<string, unknown>[], known: Set<string>, vid: string, day: string): Ops {
  const ops: Ops = { paths: [], refs: [], devices: [], banners: [], funnel: { atc: 0, co: 0, usdc: 0, bank: 0 } };
  for (const e of events) {
    switch (e.t) {
      case "pv": {
        const p = typeof e.p === "string" ? e.p.replace(/\/+$/, "") || "/" : "";
        if (!PATH_OK.test(p)) break;
        ops.paths.push(p);
        ops.refs.push(typeof e.r === "string" && HOST_OK.test(e.r.toLowerCase()) ? e.r.toLowerCase() : "direct");
        const w = Number(e.w);
        ops.devices.push(w > 0 && w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop");
        if (vid) ops.visitor = createHmac("sha256", process.env.AUTH_SECRET || "starmius").update(`${day}|${vid}`).digest("hex").slice(0, 12);
        break;
      }
      case "imp":
      case "clk": {
        const id = typeof e.b === "string" ? e.b : "";
        if (known.has(id)) ops.banners.push({ id, kind: e.t });
        break;
      }
      case "atc": ops.funnel.atc += 1; break;
      case "co": ops.funnel.co += 1; break;
      case "usdc": ops.funnel.usdc += 1; break;
      case "bank": ops.funnel.bank += 1; break;
    }
  }
  return ops;
}

export async function recordEvents(body: TrackBody): Promise<void> {
  const vid = typeof body.vid === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.vid) ? body.vid : "";
  const events = (Array.isArray(body.events) ? body.events : []).slice(0, 20) as Record<string, unknown>[];
  if (!events.length) return;
  const known = new Set((await getSettings()).banners.map((b) => b.id));
  const day = lagosToday();
  const ops = normalise(events, known, vid, day);

  const db = await getDb();
  if (db) return recordEventsD1(db, day, ops);

  await locked(async () => {
    const f = await read();
    const d = (f.days[day] ??= emptyDay());
    d.views += ops.paths.length;
    for (const p of ops.paths) inc(d.paths, p, MAX_PATHS_PER_DAY);
    for (const r of ops.refs) inc(d.refs, r, 60);
    for (const v of ops.devices) inc(d.devices, v, 3);
    if (ops.visitor && d.visitors.length < MAX_VISITORS_PER_DAY && !d.visitors.includes(ops.visitor)) d.visitors.push(ops.visitor);
    for (const b of ops.banners) {
      const x = (d.banners[b.id] ??= { imp: 0, clk: 0 });
      x[b.kind] += 1;
    }
    d.funnel.atc += ops.funnel.atc; d.funnel.co += ops.funnel.co; d.funnel.usdc += ops.funnel.usdc; d.funnel.bank = (d.funnel.bank ?? 0) + ops.funnel.bank;
    await write(f);
  });
}

async function recordEventsD1(db: D1Database, day: string, ops: Ops): Promise<void> {
  const counts = new Map<string, { kind: string; key: string; n: number }>();
  const add = (kind: string, key: string, n = 1) => {
    if (!n) return;
    const k = `${kind}|${key}`;
    const c = counts.get(k);
    if (c) c.n += n; else counts.set(k, { kind, key, n });
  };
  add("views", "_", ops.paths.length);
  ops.paths.forEach((p) => add("path", p));
  ops.refs.forEach((r) => add("ref", r));
  ops.devices.forEach((v) => add("device", v));
  ops.banners.forEach((b) => add(b.kind, b.id));
  add("funnel", "atc", ops.funnel.atc); add("funnel", "co", ops.funnel.co); add("funnel", "usdc", ops.funnel.usdc); add("funnel", "bank", ops.funnel.bank);

  // Stop one day from collecting unlimited distinct pages.
  if (ops.paths.length) {
    const row = await db.prepare("SELECT COUNT(*) AS c FROM counters WHERE day = ? AND kind = 'path'").bind(day).first<{ c: number }>();
    if ((row?.c ?? 0) >= MAX_PATHS_PER_DAY) for (const k of [...counts.keys()]) if (k.startsWith("path|")) counts.delete(k);
  }

  const stmts = [...counts.values()].map((c) =>
    db.prepare("INSERT INTO counters (day, kind, key, n) VALUES (?, ?, ?, ?) ON CONFLICT(day, kind, key) DO UPDATE SET n = n + excluded.n").bind(day, c.kind, c.key, c.n));
  if (ops.visitor) stmts.push(db.prepare("INSERT OR IGNORE INTO visitors (day, hash) VALUES (?, ?)").bind(day, ops.visitor));
  if (stmts.length) await db.batch(stmts);

  // Now and then, drop data older than the retention window.
  if (Math.random() < 0.02) {
    const cutoff = lagosToday(new Date(Date.now() - KEEP_DAYS * 86_400_000));
    await db.batch([db.prepare("DELETE FROM counters WHERE day < ?").bind(cutoff), db.prepare("DELETE FROM visitors WHERE day < ?").bind(cutoff)]);
  }
}

/** Records one verified Paystack payment. Safe to call many times for the same reference. */
export async function recordPaidOrder(o: { ref: string; amountNGN: number; shippingNGN: number; state?: string; city?: string; items: { slug: string; qty: number }[]; at?: string; method?: "paystack" | "bank" | "usdc" | "usdt"; amountUSD?: number }): Promise<void> {
  const crypto = o.method === "usdc" || o.method === "usdt";
  if (!o.ref || !(crypto ? (o.amountUSD ?? 0) > 0 : o.amountNGN > 0)) return;
  const [products, settings] = await Promise.all([getAllProducts(), getSettings()]);
  const priced = priceCart(o.items, products, settings.shipping, o.state, o.city);
  const at = o.at && !Number.isNaN(Date.parse(o.at)) ? new Date(o.at).toISOString() : new Date().toISOString();
  const record: OrderRecord = {
    ref: o.ref, at, method: o.method ?? "paystack", day: lagosToday(new Date(at)), amountNGN: crypto ? 0 : Math.round(o.amountNGN), shippingNGN: crypto ? 0 : Math.round(o.shippingNGN), ...(crypto ? { amountUSD: Math.round((o.amountUSD ?? 0) * 100) / 100 } : {}),
    state: (o.state ?? "").slice(0, 40), city: (o.city ?? "").slice(0, 80),
    items: priced.items.map((i) => ({ slug: i.product.slug, name: i.product.name, qty: i.qty, lineNGN: crypto ? 0 : i.lineNGN })),
  };

  const db = await getDb();
  if (db) {
    await db.prepare("INSERT OR IGNORE INTO orders (ref, day, at, data) VALUES (?, ?, ?, ?)").bind(record.ref, record.day, record.at, JSON.stringify(record)).run();
    return;
  }
  await locked(async () => {
    const f = await read();
    if (f.orders.some((x) => x.ref === record.ref)) return;
    f.orders.push(record);
    await write(f);
  });
}

// ---- Loading for the report ---------------------------------------------

interface DayView {
  views: number; visitors: number;
  paths: Record<string, number>; refs: Record<string, number>; devices: Record<string, number>;
  banners: Record<string, BannerDay>; funnel: { atc: number; co: number; usdc: number; bank: number };
}
interface Loaded { days: Record<string, DayView>; orders: OrderRecord[] }

async function load(from: string, to: string): Promise<Loaded> {
  const db = await getDb();
  if (!db) {
    const f = await read();
    const days: Record<string, DayView> = {};
    for (const [day, d] of Object.entries(f.days)) if (day >= from && day <= to) days[day] = { ...d, visitors: d.visitors.length };
    return { days, orders: f.orders.filter((o) => o.day >= from && o.day <= to) };
  }
  const [counters, visitors, orders] = await Promise.all([
    db.prepare("SELECT day, kind, key, n FROM counters WHERE day >= ? AND day <= ?").bind(from, to).all<{ day: string; kind: string; key: string; n: number }>(),
    db.prepare("SELECT day, COUNT(*) AS c FROM visitors WHERE day >= ? AND day <= ? GROUP BY day").bind(from, to).all<{ day: string; c: number }>(),
    db.prepare("SELECT data FROM orders WHERE day >= ? AND day <= ?").bind(from, to).all<{ data: string }>(),
  ]);
  const days: Record<string, DayView> = {};
  const day = (k: string) => (days[k] ??= { views: 0, visitors: 0, paths: {}, refs: {}, devices: {}, banners: {}, funnel: { atc: 0, co: 0, usdc: 0, bank: 0 } });
  for (const r of counters.results ?? []) {
    const d = day(r.day);
    if (r.kind === "views") d.views += r.n;
    else if (r.kind === "path") d.paths[r.key] = r.n;
    else if (r.kind === "ref") d.refs[r.key] = r.n;
    else if (r.kind === "device") d.devices[r.key] = r.n;
    else if (r.kind === "imp" || r.kind === "clk") (d.banners[r.key] ??= { imp: 0, clk: 0 })[r.kind] = r.n;
    else if (r.kind === "funnel" && (r.key === "atc" || r.key === "co" || r.key === "usdc" || r.key === "bank")) d.funnel[r.key] = r.n;
  }
  for (const v of visitors.results ?? []) day(v.day).visitors = v.c;
  return { days, orders: (orders.results ?? []).map((o) => JSON.parse(o.data) as OrderRecord) };
}

// ---- Report -------------------------------------------------------------

const sortCounts = (o: Record<string, number>, n: number) =>
  Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));

export async function getReport(rangeDays: number) {
  const range = [7, 30, 90, 365].includes(rangeDays) ? rangeDays : 30;
  const days: string[] = [];
  for (let i = range - 1; i >= 0; i--) days.push(lagosToday(new Date(Date.now() - i * 86_400_000)));
  const [f, settings] = await Promise.all([load(days[0] as string, days[days.length - 1] as string), getSettings()]);
  const inRange = new Set(days);

  const paths: Record<string, number> = {};
  const refs: Record<string, number> = {};
  const devices: Record<string, number> = {};
  const adDay: Record<string, BannerDay> = {};
  const funnel = { atc: 0, co: 0, usdc: 0, bank: 0 };
  let views = 0;
  let visitors = 0;

  const orders = f.orders.filter((o) => inRange.has(o.day));
  const daily = days.map((day) => {
    const d = f.days[day];
    const dayOrders = orders.filter((o) => o.day === day);
    views += d?.views ?? 0;
    visitors += d?.visitors ?? 0;
    for (const [k, v] of Object.entries(d?.paths ?? {})) paths[k] = (paths[k] ?? 0) + v;
    for (const [k, v] of Object.entries(d?.refs ?? {})) refs[k] = (refs[k] ?? 0) + v;
    for (const [k, v] of Object.entries(d?.devices ?? {})) devices[k] = (devices[k] ?? 0) + v;
    for (const [k, v] of Object.entries(d?.banners ?? {})) {
      const a = (adDay[k] ??= { imp: 0, clk: 0 });
      a.imp += v.imp; a.clk += v.clk;
    }
    funnel.atc += d?.funnel.atc ?? 0; funnel.co += d?.funnel.co ?? 0; funnel.usdc += d?.funnel.usdc ?? 0; funnel.bank += d?.funnel.bank ?? 0;
    return { day, views: d?.views ?? 0, visitors: d?.visitors ?? 0, orders: dayOrders.length, revenueNGN: dayOrders.reduce((s, o) => s + o.amountNGN, 0) };
  });

  const revenueNGN = orders.reduce((s, o) => s + o.amountNGN, 0);
  const revenueUSD = Math.round(orders.reduce((s, o) => s + (o.amountUSD ?? 0), 0) * 100) / 100;
  const nairaOrders = orders.filter((o) => o.amountNGN > 0).length;
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
      views, visitors, orders: orders.length, revenueNGN, revenueUSD, adRevenueNGN,
      aovNGN: nairaOrders ? Math.round(revenueNGN / nairaOrders) : 0,
      conversion: visitors ? orders.length / visitors : 0,
      adImpressions: ads.reduce((s, a) => s + a.imp, 0), adClicks: ads.reduce((s, a) => s + a.clk, 0),
    },
    funnel, daily, ads,
    topPages: sortCounts(paths, 10), referrers: sortCounts(refs, 8), devices: sortCounts(devices, 3),
    topProducts: Object.entries(products).map(([slug, p]) => ({ slug, ...p })).sort((a, b) => b.revenueNGN - a.revenueNGN).slice(0, 8),
    byState: Object.entries(byState).map(([state, s]) => ({ state, ...s })).sort((a, b) => b.revenueNGN - a.revenueNGN).slice(0, 8),
    recentOrders: [...orders].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10).map((o) => ({ ref: o.ref, at: o.at, amountNGN: o.amountNGN, amountUSD: o.amountUSD ?? 0, state: o.state, city: o.city, method: o.method ?? "paystack", items: o.items.reduce((s, i) => s + i.qty, 0) })),
  };
}
