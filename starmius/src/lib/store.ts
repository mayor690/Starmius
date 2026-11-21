import "server-only";
import { randomBytes } from "node:crypto";
import { categories as seedCategories } from "@/data/categories";
import { PHONE, contact as seedContact } from "@/data/contact";
import { site } from "@/data/site";
import { products as seedProducts } from "@/data/products";
import { socials as seedSocials } from "@/data/socials";
import { withDemoBanners, withDemoProducts } from "@/data/demo";
import { SAMPLE_BANNERS, isLive } from "./banners";
import { readDoc, writeDoc, writeUpload } from "./storage";
import { seedUsdc } from "./usdc";
import { DEFAULT_LOW_STOCK, effectiveStock } from "./stock";
import type { Category, Contact, Product, SiteSettings, SocialLink } from "./types";

/**
 * The shop's catalogue and settings. Saved through lib/storage.ts: files in DATA_DIR locally,
 * a D1 database on Cloudflare. First run seeds from src/data/*.ts.
 */

interface CatalogFile { categories: Category[]; products: Product[] }

const seedSettings = (): SiteSettings => ({
  socials: seedSocials,
  email: seedContact.channels.find((c) => c.id === "email")?.value ?? "",
  brandHandle: seedContact.brandHandle,
  address: seedContact.address,
  hours: seedContact.hours,
  lowStockThreshold: DEFAULT_LOW_STOCK,
  shipping: { defaultNGN: site.shipping.flatNGN, defaultUSDC: site.shipping.flatUSDC, zones: [], cityRules: [] },
  banners: withDemoBanners(SAMPLE_BANNERS),
  carouselSeconds: 5,
  usdc: seedUsdc(),
});

// Serialises writes so two saves never interleave.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const readCatalog = () => readDoc<CatalogFile>("catalog", () => ({ categories: seedCategories, products: withDemoProducts(seedProducts) }));
// Older site.json files predate newer settings, so fill in defaults.
const readSettings = async (): Promise<SiteSettings> => {
  const merged = { ...seedSettings(), ...(await readDoc<Partial<SiteSettings>>("site", seedSettings)) };
  return { ...merged, shipping: { ...merged.shipping, cityRules: merged.shipping.cityRules ?? [] }, usdc: { ...seedUsdc(), ...(merged.usdc ?? {}) } };
};

// Reads
/** Products as saved, for the dashboard. */
export const getRawProducts = async () => (await readCatalog()).products;
/** Products as customers see them: sold out and low stock worked out from the item count. */
export async function getAllProducts(): Promise<Product[]> {
  const [cat, settings] = await Promise.all([readCatalog(), readSettings()]);
  return cat.products.map((p) => ({ ...p, stock: effectiveStock(p, settings.lowStockThreshold) }));
}
export const getCategories = async () => (await readCatalog()).categories;
export const getSettings = readSettings;
export const getActiveBanners = async () => (await readSettings()).banners.filter((b) => isLive(b));
export const getCarouselSeconds = async () => (await readSettings()).carouselSeconds;
export const getUsdc = async () => (await readSettings()).usdc;
export const getShipping = async () => (await readSettings()).shipping;
export const getSocials = async (): Promise<SocialLink[]> => (await readSettings()).socials;

export async function getContact(): Promise<Contact> {
  const s = await readSettings();
  return {
    brandHandle: s.brandHandle,
    channels: [
      { id: "phone", label: "Phone", value: PHONE, href: `tel:${PHONE}`, icon: "phone" },
      ...(s.email ? [{ id: "email", label: "Email", value: s.email, href: `mailto:${s.email}`, icon: "mail" }] : []),
    ],
    address: s.address,
    hours: s.hours,
  };
}

export async function getWhatsappBase(): Promise<string | null> {
  return (await getSocials()).find((s) => s.id === "whatsapp")?.url ?? null;
}

// Writes
export function saveProduct(product: Product, originalSlug?: string): Promise<void> {
  return locked(async () => {
    const cat = structuredClone(await readCatalog());
    if (!cat.categories.some((c) => c.id === product.categoryId)) throw new Error("Unknown category.");
    const from = originalSlug ?? product.slug;
    const idx = cat.products.findIndex((p) => p.slug === from);
    if (product.slug !== from && cat.products.some((p) => p.slug === product.slug)) throw new Error("Another product already uses that slug.");
    if (idx === -1 && originalSlug) throw new Error("Product not found.");
    if (idx === -1 && cat.products.some((p) => p.slug === product.slug)) throw new Error("Another product already uses that slug.");
    if (idx === -1) cat.products.push(product);
    else cat.products[idx] = product;
    await writeDoc("catalog", cat);
  });
}

export function deleteProduct(slug: string): Promise<void> {
  return locked(async () => {
    const cat = await readCatalog();
    const next = cat.products.filter((p) => p.slug !== slug);
    if (next.length === cat.products.length) throw new Error("Product not found.");
    await writeDoc("catalog", { ...cat, products: next });
  });
}

export function saveCategories(categories: Category[]): Promise<void> {
  return locked(async () => {
    const cat = await readCatalog();
    const ids = new Set(categories.map((c) => c.id));
    const orphaned = cat.products.filter((p) => !ids.has(p.categoryId));
    if (orphaned.length) throw new Error(`Move or delete these products before removing their category: ${orphaned.map((p) => p.name).join(", ")}`);
    await writeDoc("catalog", { ...cat, categories });
  });
}

export function saveSettings(settings: SiteSettings): Promise<void> {
  return locked(() => writeDoc("site", settings));
}

const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export async function saveUpload(data: Buffer, ext: "jpg" | "png" | "webp"): Promise<string> {
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeUpload(name, data, TYPES[ext]);
  return `/media/${name}`;
}
