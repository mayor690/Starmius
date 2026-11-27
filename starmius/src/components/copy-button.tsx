"use client";

import { useState } from "react";

/** Small "Copy" link that copies text and briefly says "Copied". */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="shrink-0 text-xs font-medium uppercase tracking-[0.2em] text-champagne-700 underline underline-offset-4"
      aria-label={`${label} ${text}`}
      onClick={() => { void navigator.clipboard.writeText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 2000); }).catch(() => undefined); }}>
      {done ? "Copied" : label}
    </button>
  );
}
