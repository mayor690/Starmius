"use client";

import { useEffect, useRef } from "react";
import { trackBanner } from "@/lib/track";
import type { Banner } from "@/lib/types";
import { BannerView } from "./banner-view";

/** A banner on the storefront. Counts an impression once it is at least half visible, and a click on its button. */
export function TrackedBanner({ banner }: { banner: Banner }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { trackBanner("imp", banner.id); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [banner.id]);
  return <div ref={ref}><BannerView banner={banner} onCta={() => trackBanner("clk", banner.id)} /></div>;
}
