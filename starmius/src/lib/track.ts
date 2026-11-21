"use client";

/** Tiny cookie-free event sender for the Stats page. Events are batched and sent together. */

type Ev = { t: "pv"; p: string; r: string; w: number } | { t: "imp" | "clk"; b: string } | { t: "atc" | "co" | "usdc" };

const VID_KEY = "starmius:vid";
let queue: Ev[] = [];
let timer: number | undefined;
const seen = new Set<string>();

function vid(): string {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(VID_KEY, v); }
    return v;
  } catch { return ""; }
}

function flush() {
  timer = undefined;
  if (!queue.length) return;
  const body = JSON.stringify({ vid: vid(), events: queue.slice(0, 20) });
  queue = queue.slice(20);
  void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  if (queue.length) timer = window.setTimeout(flush, 500);
}

export function track(e: Ev) {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin")) return;
  queue.push(e);
  timer ??= window.setTimeout(flush, 800);
}

export function trackPageView(path: string) {
  seen.clear(); // banner impressions count once per page view
  let r = "direct";
  try { const h = new URL(document.referrer).host.toLowerCase(); if (h && h !== window.location.host) r = h; } catch { /* no referrer */ }
  track({ t: "pv", p: path, r, w: window.innerWidth });
}

export function trackBanner(kind: "imp" | "clk", id: string) {
  if (kind === "imp") { if (seen.has(id)) return; seen.add(id); }
  track({ t: kind, b: id });
}
