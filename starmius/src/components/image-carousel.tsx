"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCatalog } from "./catalog-provider";

/**
 * Product photo carousel for items with 2 to 4 pictures. Dots switch pictures, and touch swipe works too.
 * The dots sit outside the link so they never open the product page.
 */
export function ImageCarousel({ images, name, href, soldOut = false, sizes, priority = false, className = "", autoplay = true }: {
  images: string[]; name: string; href?: string; soldOut?: boolean; sizes: string; priority?: boolean; className?: string;
  /** Follows the carousel speed set in the dashboard. Pass false to keep this one manual. */
  autoplay?: boolean;
}) {
  const { carouselMs } = useCatalog();
  const autoplayMs = autoplay ? carouselMs : 0;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const count = images.length;
  const go = (n: number) => setI(((n % count) + count) % count);

  // Auto-advance. Waits a full interval after any manual switch, and stops while hovered, focused,
  // in a hidden tab, or when the visitor prefers reduced motion.
  useEffect(() => {
    if (!autoplayMs || paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => { if (!document.hidden) setI((n) => (n + 1) % count); }, autoplayMs);
    return () => window.clearInterval(t);
  }, [i, paused, autoplayMs, count]);

  const track = (
    <div className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${i * 100}%)` }}>
      {images.map((src, n) => (
        <div key={src} className="relative h-full w-full shrink-0" aria-hidden={n !== i}>
          <Image src={src} alt={n === i ? `${name}, picture ${n + 1} of ${count}` : ""} fill sizes={sizes} priority={priority && n === 0}
            unoptimized={src.startsWith("/media/")}
            className={`object-cover transition-transform duration-700 group-hover:scale-[1.03] ${soldOut ? "opacity-40 grayscale" : ""}`} />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-ivory-100 via-ivory-200 to-champagne-200/60 ${className}`}
      onTouchStart={(e) => { startX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        const x = e.changedTouches[0]?.clientX;
        if (startX.current !== null && x !== undefined && Math.abs(x - startX.current) > 40) go(i + (x < startX.current ? 1 : -1));
        startX.current = null;
      }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); }}
      role="group" aria-roledescription="carousel" aria-label={`${name} pictures`}
    >
      {href ? <Link href={href} className="absolute inset-0 block" tabIndex={-1}>{track}</Link> : track}
      {soldOut && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-ivory-50/60" aria-hidden="true" />
          <span className="pointer-events-none absolute inset-x-0 top-5 mx-auto w-fit bg-charcoal-950/90 px-5 py-2 text-[0.65rem] font-medium uppercase tracking-[0.3em] text-ivory-50">Out of stock</span>
        </>
      )}
      <div className="absolute inset-x-0 bottom-1 flex justify-center">
        {images.map((_, n) => (
          <button key={n} type="button" onClick={() => go(n)} aria-label={`Show picture ${n + 1} of ${count}`} aria-current={n === i}
            className="grid size-8 place-items-center">
            <span className={`block rounded-full border border-charcoal-950/30 transition-all ${n === i ? "size-2.5 bg-champagne-600" : "size-2 bg-ivory-50/90"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
