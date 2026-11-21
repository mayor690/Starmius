import type { Banner, BannerPlacement, BannerTone, BannerType } from "./types";

export const BANNER_TYPE_LABELS: Record<BannerType, string> = { ad: "Featured", promo: "Promo", hot_sale: "Hot sale" };
export const BANNER_PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  top: "Top bar (every page)",
  home: "Home page, under the hero",
  shop: "Shop page, above the products",
  popup: "Pop-up (dims the page, closes with X)",
};
export const BANNER_TONE_LABELS: Record<BannerTone, string> = { charcoal: "Charcoal", champagne: "Champagne", ivory: "Ivory" };
export const MAX_BANNERS = 12;

/** Today's date in Nigeria (UTC+1) as YYYY-MM-DD, so a sale ends at local midnight. */
export const lagosToday = (now = new Date()) => new Date(now.getTime() + 3_600_000).toISOString().slice(0, 10);

export function isLive(b: Banner, now = new Date()): boolean {
  if (!b.active) return false;
  const today = lagosToday(now);
  if (b.startsAt && today < b.startsAt) return false;
  if (b.endsAt && today > b.endsAt) return false;
  return true;
}

/** Starting points for the "Add banner" buttons and the first-run samples. All start switched off. */
export const BANNER_TEMPLATES: Record<BannerType, Omit<Banner, "id">> = {
  hot_sale: {
    type: "hot_sale", placement: "home", tone: "charcoal", active: false,
    title: "Hot sale. Limited stock.", text: "Our favourites at a special price. When it is gone, it is gone.",
    ctaLabel: "Shop now", ctaHref: "/shop",
  },
  promo: {
    type: "promo", placement: "home", tone: "champagne", active: false,
    title: "New in: Enlargements", text: "Discover the new body care range, made for daily use.",
    ctaLabel: "Explore", ctaHref: "/shop?category=enlargements",
  },
  ad: {
    type: "ad", placement: "shop", tone: "ivory", active: false,
    title: "Complete your routine", text: "Face and body care that layers beautifully together.",
    ctaLabel: "Shop face creams", ctaHref: "/shop?category=face-creams",
  },
};

/** Pop-up sample, kept apart so every banner kind has a starting point. */
const POPUP_SAMPLE: Banner = {
  id: "sample-popup-hot-sale", type: "hot_sale", placement: "popup", tone: "charcoal", active: false,
  title: "Hot sale is on", text: "Selected Starmius favourites at special prices, while stock lasts.",
  ctaLabel: "Shop the sale", ctaHref: "/shop",
};

/** First-run samples, so the dashboard shows what each kind of banner looks like. Off until the owner switches them on. */
export const SAMPLE_BANNERS: Banner[] = [
  { id: "sample-top-hot-sale", ...BANNER_TEMPLATES.hot_sale, placement: "top", title: "Hot sale on now", text: "Selected Starmius favourites for a limited time.", ctaLabel: "Shop the sale" },
  { id: "sample-home-hot-sale", ...BANNER_TEMPLATES.hot_sale },
  { id: "sample-home-promo", ...BANNER_TEMPLATES.promo },
  { id: "sample-shop-ad", ...BANNER_TEMPLATES.ad },
  POPUP_SAMPLE,
];
