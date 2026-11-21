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
}

export interface Contact {
  brandHandle: string;
  channels: ContactChannel[];
  address: InfoBlock | null;
  hours: InfoBlock | null;
}
