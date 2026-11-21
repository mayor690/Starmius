import type { ShippingConfig } from "./shipping";

export type StockStatus = "in_stock" | "low_stock" | "preorder" | "out_of_stock";

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  categoryId: string;
  priceNGN: number;
  priceUSDC: number;
  stock: StockStatus;
  /** Items left. Leave out to not track a count. 0 means sold out. */
  quantity?: number;
  /** Paths under /public (e.g. "/products/glow-cream.jpg") or allowed remote URLs. Empty is fine. */
  images: string[];
  size?: string;
  featured?: boolean;
  benefits?: string[];
  ingredients?: string;
  howToUse?: string;
}

export interface SocialLink {
  id: string;
  label: string;
  handle?: string;
  url: string;
  /** Icon key from components/icons.tsx */
  icon: string;
  showInFooter?: boolean;
  showInContact?: boolean;
}

/** Where USDC payments are received. Chain definitions and token contracts stay in data/payments.ts. */
export interface UsdcSettings {
  /** One address that works on every EVM chain. Empty until you set it. */
  evmAddress: string;
  solanaAddress: string;
  /** Chain ids switched off at checkout. */
  disabledChains: string[];
}

export interface ContactChannel {
  id: string;
  label: string;
  value: string;
  href?: string;
  icon: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface InfoBlock {
  label: string;
  lines: string[];
}

/** Owner-editable site details. The phone number is never stored; it is fixed in data/contact.ts. */
export interface SiteSettings {
  socials: SocialLink[];
  email: string;
  brandHandle: string;
  address: InfoBlock | null;
  hours: InfoBlock | null;
  /** "Only N left" shows once a tracked product has this many or fewer. */
  lowStockThreshold: number;
  shipping: ShippingConfig;
  banners: Banner[];
  /** Seconds between pictures in carousels. 0 turns auto-advance off. */
  carouselSeconds: number;
  usdc: UsdcSettings;
}

export interface Contact {
  brandHandle: string;
  channels: ContactChannel[];
  address: InfoBlock | null;
  hours: InfoBlock | null;
}

export type BannerType = "ad" | "promo" | "hot_sale";
export type BannerPlacement = "top" | "home" | "shop" | "popup";
export type BannerTone = "charcoal" | "champagne" | "ivory";

/** An advert, promotion or hot sale shown on the storefront. Managed in the dashboard. */
export interface Banner {
  id: string;
  type: BannerType;
  /** top: slim bar above the header. home: large card under the hero. shop: card above the product grid. popup: dims the page until the visitor closes it. */
  placement: BannerPlacement;
  title: string;
  text?: string;
  /** Small label. Defaults to the banner type (Hot sale, Promo, Featured). */
  badge?: string;
  ctaLabel?: string;
  /** Site path such as /shop?category=enlargements, or a full https:// link. */
  ctaHref?: string;
  /** Optional background photo, uploaded in the dashboard. */
  image?: string;
  /** Optional item photos (for example a product), shown as a framed picture next to the text. Two to four become a carousel. */
  itemImages?: string[];
  /** A business paying for this space. Shown to visitors as "Sponsored". */
  advertiser?: string;
  /** What the advertiser paid you (NGN). Only used for your Stats page. */
  adRevenueNGN?: number;
  tone: BannerTone;
  active: boolean;
  /** Optional YYYY-MM-DD window (Nigeria time). Empty means no limit. */
  startsAt?: string;
  endsAt?: string;
}
