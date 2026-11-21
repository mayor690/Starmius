import Link from "next/link";
import { BANNER_TYPE_LABELS } from "@/lib/banners";
import type { Banner } from "@/lib/types";
import { ImageCarousel } from "./image-carousel";

const TONES = {
  charcoal: { box: "bg-charcoal-950 text-ivory-50", badge: "bg-champagne-400 text-charcoal-950", text: "text-ivory-200", cta: "border-champagne-300 text-champagne-200 hover:bg-champagne-300 hover:text-charcoal-950", glow: "from-champagne-500/25" },
  champagne: { box: "bg-gradient-to-br from-champagne-200 to-champagne-300 text-charcoal-950", badge: "bg-charcoal-950 text-champagne-200", text: "text-charcoal-800", cta: "border-charcoal-900 text-charcoal-900 hover:bg-charcoal-900 hover:text-ivory-50", glow: "from-ivory-50/60" },
  ivory: { box: "bg-ivory-100 text-ink border border-champagne-400/60 shadow-[0_24px_50px_-32px_rgba(107,79,42,0.55)]", badge: "bg-champagne-700 text-ivory-50", text: "text-muted", cta: "border-champagne-700 text-champagne-700 hover:bg-champagne-700 hover:text-ivory-50", glow: "from-champagne-300/40" },
} as const;

function Cta({ banner, className, onCta }: { banner: Banner; className: string; onCta?: () => void }) {
  if (!banner.ctaHref || !banner.ctaLabel) return null;
  const external = banner.ctaHref.startsWith("https://");
  return external ? (
    <a href={banner.ctaHref} target="_blank" rel="noopener noreferrer sponsored" className={className} onClick={onCta}>{banner.ctaLabel}</a>
  ) : (
    <Link href={banner.ctaHref} className={className} onClick={onCta}>{banner.ctaLabel}</Link>
  );
}

/**
 * One advert, promo or hot sale. Pure markup, so it also drives the live preview in the dashboard
 * and the pop-up. `onCta` lets the pop-up close itself when its button is used.
 */
export function BannerView({ banner, onCta }: { banner: Banner; onCta?: () => void }) {
  const hasImage = Boolean(banner.image);
  const t = hasImage ? TONES.charcoal : TONES[banner.tone];
  const badge = banner.badge || (banner.advertiser ? "Sponsored" : BANNER_TYPE_LABELS[banner.type]);
  const sponsor = banner.advertiser ? `Sponsored by ${banner.advertiser}` : "";
  const badgeEl = (
    <span className={`inline-flex w-fit items-center px-3 py-1 text-[0.62rem] font-medium uppercase tracking-[0.3em] ${t.badge}`}>{badge}</span>
  );
  const cta = `inline-flex items-center justify-center border px-6 py-3 text-[0.7rem] font-medium uppercase tracking-[0.25em] transition-colors ${t.cta}`;

  if (banner.placement === "top") {
    return (
      <div className={`${t.box} relative`} role="region" aria-label={`${badge}: ${banner.title}`}>
        {hasImage && <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${banner.image})` }} aria-hidden="true" />}
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-6 py-2.5 text-center text-xs tracking-wider">
          {badgeEl}
          <span className="font-medium">{banner.title}</span>
          {sponsor && <span className="hidden text-[0.62rem] uppercase tracking-[0.2em] opacity-70 md:inline">{sponsor}</span>}
          {banner.text && <span className={`hidden sm:inline ${t.text}`}>{banner.text}</span>}
          <Cta banner={banner} onCta={onCta} className="font-medium uppercase tracking-[0.25em] underline underline-offset-4" />
        </div>
      </div>
    );
  }

  const popup = banner.placement === "popup";
  const photos = (banner.itemImages ?? []).slice(0, 4);
  const frame = "aspect-[4/5] w-full border border-champagne-300/60 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]";
  // One photo is a plain picture; two to four become a carousel with dots.
  const picture = photos.length ? (
    <div className={`relative mx-auto w-full ${popup ? "max-w-52" : "max-w-64"} shrink-0`}>
      {photos.length >= 2 ? (
        <ImageCarousel images={photos} name={banner.title} sizes={popup ? "208px" : "256px"} className={frame} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photos[0]} alt="" className={`${frame} bg-ivory-100 object-cover`} />
      )}
    </div>
  ) : null;

  return (
    <section className={`${t.box} relative overflow-hidden`} aria-label={`${badge}: ${banner.title}`}>
      {hasImage ? (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${banner.image})` }} aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/90 via-charcoal-950/60 to-charcoal-950/10" aria-hidden="true" />
        </>
      ) : (
        <div className={`pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-radial to-transparent ${t.glow}`} aria-hidden="true" />
      )}
      <div className={`relative flex ${popup ? "flex-col gap-6 px-7 py-9 text-center sm:px-10" : "flex-col gap-8 px-8 py-12 sm:px-14 md:flex-row md:items-center md:justify-between md:py-16"}`}>
        {popup && picture}
        <div className={`flex flex-col gap-5 ${popup ? "items-center" : "items-start"}`}>
          {badgeEl}
          <h2 className={`max-w-2xl font-display font-medium leading-tight text-balance ${popup ? "text-3xl" : "text-4xl md:text-5xl"}`}>{banner.title}</h2>
          <span className="h-px w-12 bg-current opacity-40" aria-hidden="true" />
          {banner.text && <p className={`max-w-xl leading-relaxed text-pretty ${t.text}`}>{banner.text}</p>}
          {sponsor && <p className="text-[0.62rem] uppercase tracking-[0.25em] opacity-70">{sponsor}</p>}
          <Cta banner={banner} onCta={onCta} className={`${cta} mt-2`} />
        </div>
        {!popup && picture}
      </div>
    </section>
  );
}
