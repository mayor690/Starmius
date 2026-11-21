"use client";

import { useEffect, useRef, useState } from "react";

interface GoogleId {
  initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, string | number>) => void;
}
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}

const SRC = "https://accounts.google.com/gsi/client";

export function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const render = () => {
      const g = window.google?.accounts.id;
      if (!g || !ref.current) return;
      g.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential) });
      g.renderButton(ref.current, { theme: "outline", size: "large", shape: "rectangular", text: "continue_with", width: 320, logo_alignment: "center" });
    };
    if (window.google) { render(); return; }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: SRC, async: true });
    script.addEventListener("load", render);
    script.addEventListener("error", () => setFailed(true));
    if (!existing) document.head.appendChild(script);
    return () => script.removeEventListener("load", render);
  }, [clientId, onCredential]);

  if (!clientId) return <p className="text-center text-xs text-muted">Google sign in is not configured yet.</p>;
  if (failed) return <p className="text-center text-xs text-muted">Google sign in could not load.</p>;
  return <div ref={ref} className="flex justify-center" />;
}
