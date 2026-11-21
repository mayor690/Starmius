"use client";

import { useState } from "react";
import { adminApi } from "@/lib/admin-api";

type Line = { ok: boolean; detail: string };
type Health = { mode: "cloudflare" | "files"; data: Line; images: Line };

/** Lets the owner test that saving and uploading really work where the site is hosted. */
export function StorageCheck() {
  const [h, setH] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true); setError("");
    try { setH(await adminApi<Health>("/api/admin/health", "GET")); } catch (e) { setError(e instanceof Error ? e.message : "Check failed."); }
    setBusy(false);
  }

  const row = (label: string, l: Line) => (
    <li className="flex gap-3 text-sm">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${l.ok ? "bg-emerald-700" : "bg-red-800"}`} aria-hidden="true" />
      <span><span className="font-medium">{label}: {l.ok ? "working" : "not working"}.</span> <span className="text-muted">{l.detail}</span></span>
    </li>
  );

  return (
    <section>
      <h2 className="font-display text-3xl font-medium">Storage check</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Tests that saving changes and uploading images work where your site is hosted. If something fails, the message says what to fix.</p>
      <button type="button" className="btn btn-outline mt-5" onClick={() => void run()} disabled={busy}>{busy ? "Checking" : "Run storage check"}</button>
      {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
      {h && (
        <ul className="mt-5 flex flex-col gap-3">
          <li className="text-xs uppercase tracking-[0.2em] text-muted">Hosted on {h.mode === "cloudflare" ? "Cloudflare" : "local files"}</li>
          {row("Saving changes", h.data)}
          {row("Uploading images", h.images)}
        </ul>
      )}
    </section>
  );
}
