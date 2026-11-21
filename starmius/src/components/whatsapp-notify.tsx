"use client";

import { useEffect, useState } from "react";

export const USDC_WA_KEY = "starmius:usdc-whatsapp";

/**
 * Sends the order details to the business WhatsApp.
 * - `url` given (Naira): opens WhatsApp automatically once per payment reference.
 * - no `url` (USDC): reads the link saved at checkout and offers a resend button.
 * A button is always shown, because browsers can block automatic redirects.
 */
export function WhatsAppNotify({ url, reference }: { url?: string; reference?: string }) {
  const [link, setLink] = useState<string | null>(url ?? null);

  useEffect(() => {
    if (url) { setLink(url); return; }
    try { setLink(sessionStorage.getItem(USDC_WA_KEY)); } catch { /* storage unavailable */ }
  }, [url]);

  useEffect(() => {
    if (!url || !reference) return;
    const flag = `starmius:wa-sent:${reference}`;
    let already = false;
    try { already = sessionStorage.getItem(flag) === "1"; } catch { /* storage unavailable */ }
    if (already) return;
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem(flag, "1"); } catch { /* storage unavailable */ }
      window.location.assign(url);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [url, reference]);

  if (!link) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      {url && <p className="text-sm text-muted">Opening WhatsApp so we receive your order details.</p>}
      <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
        {url ? "Open WhatsApp" : "Send order details on WhatsApp"}
      </a>
    </div>
  );
}
