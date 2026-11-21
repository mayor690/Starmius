"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Banner } from "@/lib/types";
import { trackBanner } from "@/lib/track";
import { BannerView } from "./banner-view";

const HIDE_HOURS = 24;
const QUIET_PAGES = ["/checkout", "/cart", "/account"];

const fingerprint = (b: Banner) =>
  [b.id, b.title, b.text, b.image, (b.itemImages ?? []).join(","), b.ctaHref].join("|").split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);

/** Ad pop-up: dims the page and closes with X, Close, Esc or a click outside. Stays hidden for a day once closed. */
export function BannerPopup({ banner }: { banner: Banner }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const key = `starmius:popup:${fingerprint(banner)}`;
  const quiet = QUIET_PAGES.some((p) => pathname.startsWith(p));

  const close = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem(key, String(Date.now())); } catch { /* storage unavailable */ }
  }, [key]);

  useEffect(() => {
    if (quiet) { setOpen(false); return; }
    let seen = 0;
    try { seen = Number(localStorage.getItem(key)) || 0; } catch { /* storage unavailable */ }
    if (Date.now() - seen < HIDE_HOURS * 3_600_000) return;
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [key, quiet]);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    trackBanner("imp", banner.id);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, close, banner.id]);

  if (!open || quiet) return null;
  return (
    <div className="popup-backdrop fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-charcoal-950/75 p-4 backdrop-blur-[2px]" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label={banner.title} className="popup-card relative my-auto w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button ref={closeBtn} type="button" onClick={close} aria-label="Close"
          className="absolute right-2 top-2 z-10 grid size-11 place-items-center bg-charcoal-950/70 text-ivory-50 transition-colors hover:bg-charcoal-950">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <BannerView banner={banner} onCta={() => { trackBanner("clk", banner.id); close(); }} />
        <button type="button" onClick={close} className="mt-4 block w-full text-center text-xs uppercase tracking-[0.3em] text-ivory-100 underline-offset-4 hover:underline">
          Close
        </button>
      </div>
    </div>
  );
}
