import type { Banner, Product } from "@/lib/types";

/**
 * Demo content for a fresh site, so every feature can be seen before you add your own:
 * banners switched on (including a sponsor example), picture carousels, a low-stock and a sold-out item.
 *
 * Applies only on first run, before anything is saved in the dashboard.
 * Set DEMO_CONTENT to false (or delete this file's use in lib/store.ts) to start with a clean shop.
 */
export const DEMO_CONTENT = false;

const PIC = ["/demo/pic-1.png", "/demo/pic-2.png", "/demo/pic-3.png", "/demo/pic-4.png"];

export function withDemoProducts(products: Product[]): Product[] {
  if (!DEMO_CONTENT) return products;
  const images: Record<string, string[]> = {
    "radiant-face-cream": PIC.slice(0, 3),
    "silk-body-cream": PIC,
    "luminous-night-cream": PIC.slice(1, 3),
  };
  return products.map((p) => ({
    ...p,
    ...(images[p.slug] ? { images: images[p.slug] } : {}),
    ...(p.slug === "luminous-night-cream" ? { quantity: 3 } : {}),
  }));
}

export function withDemoBanners(banners: Banner[]): Banner[] {
  if (!DEMO_CONTENT) return banners;
  const photos: Record<string, string[]> = {
    "sample-home-hot-sale": PIC.slice(0, 3),
    "sample-home-promo": PIC.slice(0, 2),
    "sample-shop-ad": PIC.slice(0, 3),
    "sample-popup-hot-sale": PIC.slice(0, 3),
  };
  const sponsor: Banner = {
    id: "sample-top-sponsor", type: "ad", placement: "top", tone: "ivory", active: true,
    title: "Your business here: reach Starmius shoppers", ctaLabel: "Advertise", ctaHref: "/contact", advertiser: "Example Advertiser",
  };
  return [...banners.map((b) => ({ ...b, active: true, ...(photos[b.id] ? { itemImages: photos[b.id] } : {}) })), sponsor];
}
