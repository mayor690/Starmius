"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trackBanner } from "@/lib/track";
import type { Banner } from "@/lib/types";
import { BannerView } from "./banner-view";

const ROTATE_MS = 7000;

/** The slim bar above the header. With several live banners (your own and sponsors) they take turns. */
export function TopBar({ banners }: { banners: Banner[] }) {
  const pathname = usePathname();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = banners[i % banners.length];

  useEffect(() => { if (current) trackBanner("imp", current.id); }, [current, pathname]);
  useEffect(() => {
    if (banners.length < 2 || paused) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % banners.length), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [banners.length, paused]);

  if (!current) return null;
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <BannerView key={current.id} banner={current} onCta={() => trackBanner("clk", current.id)} />
    </div>
  );
}
