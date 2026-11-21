import { round2 } from "./format";
import { placesFor } from "@/data/locations";
import { NIGERIA_STATES, type ShippingConfig } from "./shipping";
import { DEFAULT_LOW_STOCK, STOCK_STATUSES } from "./stock";
import { BANNER_PLACEMENT_LABELS, BANNER_TONE_LABELS, BANNER_TYPE_LABELS, MAX_BANNERS } from "./banners";
import type { Banner, BannerPlacement, BannerTone, BannerType, Category, Product, SiteSettings, SocialLink, StockStatus } from "./types";

/** Pure validators for everything the admin can write. Each returns the cleaned value or an error string. */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SOCIAL_ICONS = ["x", "telegram", "instagram", "facebook", "tiktok", "whatsapp", "youtube", "link"];
const IMAGE_PATH = /^\/(?:media|products)\/[A-Za-z0-9._-]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WA_URL = /^https:\/\/wa\.me\/\d{8,15}$/;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
// eslint-disable-next-line no-control-regex
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "");
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  (Array.isArray(v) ? v : []).map((x) => clean(x, maxLen)).filter(Boolean).slice(0, maxItems);

export function parseProduct(raw: unknown, categoryIds: string[]): Result<Product> {
  const r = obj(raw);
  const slug = clean(r.slug, 80).toLowerCase();
  const name = clean(r.name, 120);
  if (!SLUG.test(slug)) return fail("Slug may use lowercase letters, numbers and hyphens only.");
  if (!name) return fail("Product name is required.");

  const categoryId = clean(r.categoryId, 60);
  if (!categoryIds.includes(categoryId)) return fail("Please choose a valid category.");

  const priceNGN = Number(r.priceNGN);
  const priceUSDC = Number(r.priceUSDC);
  if (!Number.isInteger(priceNGN) || priceNGN < 1 || priceNGN > 100_000_000) return fail("NGN price must be a whole number above 0.");
  if (!Number.isFinite(priceUSDC) || priceUSDC <= 0 || priceUSDC > 1_000_000) return fail("USDC price must be above 0.");

  const stock = clean(r.stock, 20) as StockStatus;
  if (!STOCK_STATUSES.includes(stock)) return fail("Invalid stock status.");

  let quantity: number | undefined;
  if (r.quantity !== undefined && r.quantity !== null && String(r.quantity).trim() !== "") {
    quantity = Number(r.quantity);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100_000) return fail("Items left must be a whole number from 0 up.");
  }

  const images = (Array.isArray(r.images) ? r.images : []).map((x) => (typeof x === "string" ? x.trim() : ""));
  if (images.length > 4 || images.some((i) => !IMAGE_PATH.test(i))) return fail("Images must be uploaded through the dashboard (up to 4).");

  const product: Product = {
    slug,
    name,
    tagline: clean(r.tagline, 160),
    description: clean(r.description, 2000),
    categoryId,
    priceNGN,
    priceUSDC: round2(priceUSDC),
    stock,
    images,
    featured: r.featured === true,
  };
  if (quantity !== undefined) product.quantity = quantity;
  const size = clean(r.size, 60);
  if (size) product.size = size;
  const benefits = strList(r.benefits, 12, 200);
  if (benefits.length) product.benefits = benefits;
  const ingredients = clean(r.ingredients, 2000);
  if (ingredients) product.ingredients = ingredients;
  const howToUse = clean(r.howToUse, 1000);
  if (howToUse) product.howToUse = howToUse;
  return { ok: true, value: product };
}

export function parseCategories(raw: unknown): Result<Category[]> {
  if (!Array.isArray(raw) || raw.length > 50) return fail("Invalid categories.");
  const out: Category[] = [];
  for (const item of raw) {
    const r = obj(item);
    const name = clean(r.name, 60);
    const id = clean(r.id, 60).toLowerCase();
    if (!name) return fail("Every category needs a name.");
    if (!SLUG.test(id)) return fail(`Invalid category id "${id}".`);
    if (out.some((c) => c.id === id)) return fail("Category ids must be unique.");
    const description = clean(r.description, 200);
    out.push({ id, name, ...(description ? { description } : {}) });
  }
  return { ok: true, value: out };
}

export function parseShipping(raw: unknown): Result<ShippingConfig> {
  const r = obj(raw);
  const money = (v: unknown, max: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max ? Number(v) : null);
  const defaultNGN = money(r.defaultNGN, 10_000_000);
  const defaultUSDC = money(r.defaultUSDC, 100_000);
  if (defaultNGN === null || !Number.isInteger(defaultNGN) || defaultUSDC === null) return fail("Default delivery fee must be a number (naira in whole numbers).");
  if (!Array.isArray(r.zones) || r.zones.length > 25) return fail("Invalid delivery zones.");

  const zones: ShippingConfig["zones"] = [];
  const taken = new Set<string>();
  for (const item of r.zones) {
    const z = obj(item);
    const name = clean(z.name, 60);
    if (!name) return fail("Every delivery zone needs a name.");
    const feeNGN = money(z.feeNGN, 10_000_000);
    const feeUSDC = money(z.feeUSDC, 100_000);
    if (feeNGN === null || !Number.isInteger(feeNGN) || feeUSDC === null) return fail(`${name}: fees must be numbers (naira in whole numbers).`);
    const states = (Array.isArray(z.states) ? z.states : []).filter((s): s is string => typeof s === "string");
    for (const s of states) {
      if (!(NIGERIA_STATES as readonly string[]).includes(s)) return fail(`${name}: unknown state "${s}".`);
      if (taken.has(s)) return fail(`${s} is in more than one zone.`);
      taken.add(s);
    }
    if (!states.length) return fail(`${name}: choose at least one state.`);
    const id = clean(z.id, 40) || `zone-${zones.length + 1}`;
    zones.push({ id, name, states, feeNGN, feeUSDC: round2(feeUSDC) });
  }

  const cityRules: ShippingConfig["cityRules"] = [];
  const rawRules = Array.isArray(r.cityRules) ? r.cityRules : [];
  if (rawRules.length > 300) return fail("Too many city fees.");
  for (const item of rawRules) {
    const c = obj(item);
    const state = clean(c.state, 40);
    const city = clean(c.city, 80);
    if (!(NIGERIA_STATES as readonly string[]).includes(state)) return fail("Each city fee needs a state.");
    if (!placesFor(state).includes(city)) return fail(`${city || "City"} is not a known place in ${state}.`);
    if (cityRules.some((x) => x.state === state && x.city === city)) return fail(`${city} has more than one fee.`);
    const feeNGN = money(c.feeNGN, 10_000_000);
    const feeUSDC = money(c.feeUSDC, 100_000);
    if (feeNGN === null || !Number.isInteger(feeNGN) || feeUSDC === null) return fail(`${city}: fees must be numbers (naira in whole numbers).`);
    cityRules.push({ state, city, feeNGN, feeUSDC: round2(feeUSDC) });
  }
  return { ok: true, value: { defaultNGN, defaultUSDC: round2(defaultUSDC), zones, cityRules } };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseBanners(raw: unknown): Result<Banner[]> {
  if (!Array.isArray(raw) || raw.length > MAX_BANNERS) return fail(`You can have up to ${MAX_BANNERS} banners.`);
  const out: Banner[] = [];
  for (const item of raw) {
    const b = obj(item);
    const title = clean(b.title, 80);
    if (!title) return fail("Every banner needs a title.");
    const id = clean(b.id, 60).toLowerCase();
    if (!SLUG.test(id) || out.some((x) => x.id === id)) return fail("Each banner needs a unique id.");
    const type = clean(b.type, 20) as BannerType;
    const placement = clean(b.placement, 20) as BannerPlacement;
    const tone = clean(b.tone, 20) as BannerTone;
    if (!(type in BANNER_TYPE_LABELS)) return fail(`${title}: unknown banner type.`);
    if (!(placement in BANNER_PLACEMENT_LABELS)) return fail(`${title}: unknown placement.`);
    if (!(tone in BANNER_TONE_LABELS)) return fail(`${title}: unknown colour.`);

    const ctaHref = clean(b.ctaHref, 300);
    if (ctaHref && !(/^\/(?!\/)\S*$/.test(ctaHref) || /^https:\/\/\S+$/.test(ctaHref))) return fail(`${title}: the link must start with / (a page on your site) or https://`);
    const image = clean(b.image, 120);
    // `itemImage` (single) is the older format; keep reading it.
    const rawItems = Array.isArray(b.itemImages) ? b.itemImages : b.itemImage ? [b.itemImage] : [];
    const itemImages = rawItems.map((x) => clean(x, 120)).filter(Boolean);
    if (itemImages.length > 4) return fail(`${title}: use up to 4 item photos.`);
    if ((image && !IMAGE_PATH.test(image)) || itemImages.some((x) => !IMAGE_PATH.test(x))) return fail(`${title}: upload images through the dashboard.`);
    const startsAt = clean(b.startsAt, 10);
    const endsAt = clean(b.endsAt, 10);
    if ((startsAt && !DATE.test(startsAt)) || (endsAt && !DATE.test(endsAt))) return fail(`${title}: dates must be valid.`);
    if (startsAt && endsAt && endsAt < startsAt) return fail(`${title}: the end date is before the start date.`);

    const advertiser = clean(b.advertiser, 60);
    let adRevenueNGN: number | undefined;
    if (b.adRevenueNGN !== undefined && b.adRevenueNGN !== null && String(b.adRevenueNGN).trim() !== "") {
      adRevenueNGN = Number(b.adRevenueNGN);
      if (!Number.isInteger(adRevenueNGN) || adRevenueNGN < 0 || adRevenueNGN > 1_000_000_000) return fail(`${title}: the amount paid must be a whole number of naira.`);
    }
    const text = clean(b.text, 200);
    const badge = clean(b.badge, 20);
    const ctaLabel = clean(b.ctaLabel, 30);
    out.push({
      id, type, placement, tone, title, active: b.active === true,
      ...(text ? { text } : {}), ...(badge ? { badge } : {}),
      ...(ctaLabel && ctaHref ? { ctaLabel } : {}), ...(ctaHref ? { ctaHref } : {}),
      ...(advertiser ? { advertiser } : {}), ...(adRevenueNGN ? { adRevenueNGN } : {}),
      ...(image ? { image } : {}), ...(itemImages.length ? { itemImages } : {}), ...(startsAt ? { startsAt } : {}), ...(endsAt ? { endsAt } : {}),
    });
  }
  return { ok: true, value: out };
}

export function parseSettings(raw: unknown): Result<SiteSettings> {
  const r = obj(raw);
  const email = clean(r.email, 160);
  if (!EMAIL.test(email)) return fail("Please enter a valid contact email.");

  if (!Array.isArray(r.socials) || r.socials.length > 20) return fail("Invalid social links.");
  const socials: SocialLink[] = [];
  for (const item of r.socials) {
    const s = obj(item);
    const id = clean(s.id, 40).toLowerCase();
    const label = clean(s.label, 40);
    const url = clean(s.url, 300);
    const icon = clean(s.icon, 20);
    if (!SLUG.test(id) || socials.some((x) => x.id === id)) return fail("Each social link needs a unique id.");
    if (!label) return fail("Every social link needs a label.");
    if (!/^https:\/\/[^\s]+$/.test(url)) return fail(`${label}: the link must start with https://`);
    if (!SOCIAL_ICONS.includes(icon)) return fail(`${label}: unknown icon.`);
    const handle = clean(s.handle, 60);
    socials.push({
      id, label, url, icon,
      ...(handle ? { handle } : {}),
      showInFooter: s.showInFooter !== false,
      showInContact: s.showInContact !== false,
    });
  }
  // Order notifications are sent to this link, so it must always exist and be a valid wa.me link.
  const wa = socials.find((s) => s.id === "whatsapp");
  if (!wa || !WA_URL.test(wa.url)) return fail("Keep a WhatsApp link in the form https://wa.me/234XXXXXXXXXX. Order details are sent there.");

  const block = (v: unknown): { label: string; lines: string[] } | null => {
    const b = obj(v);
    const lines = strList(b.lines, 8, 160);
    const label = clean(b.label, 40);
    return label && lines.length ? { label, lines } : null;
  };

  const threshold = r.lowStockThreshold === undefined ? DEFAULT_LOW_STOCK : Number(r.lowStockThreshold);
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1000) return fail("Low stock level must be a whole number from 0 to 1000.");

  const carouselSeconds = r.carouselSeconds === undefined ? 5 : Number(r.carouselSeconds);
  if (!Number.isInteger(carouselSeconds) || (carouselSeconds !== 0 && (carouselSeconds < 2 || carouselSeconds > 30))) return fail("Carousel speed must be 0 (off) or from 2 to 30 seconds.");

  const shipping = parseShipping(r.shipping);
  if (!shipping.ok) return fail(shipping.error);
  const banners = parseBanners(r.banners ?? []);
  if (!banners.ok) return fail(banners.error);

  return {
    ok: true,
    value: { carouselSeconds, shipping: shipping.value, banners: banners.value, lowStockThreshold: threshold, socials, email, brandHandle: clean(r.brandHandle, 60), address: block(r.address), hours: block(r.hours) },
  };
}
