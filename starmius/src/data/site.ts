import type { NavItem, StockStatus } from "@/lib/types";

/** All page copy and global settings. Edit text here, never inside components. */
export const site = {
  name: "Starmius",
  descriptor: "Skincare",
  tagline: "Beauty & Enhancement Products",
  description: "Premium beauty and enhancement products for calm, luminous, confident skin.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_NG",
  ogImage: "/brand/portrait-1.jpeg",
  cartStorageKey: "starmius.cart.v1",
  maxQty: 10,

  nav: [
    { label: "Shop", href: "/shop" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ] satisfies NavItem[],

  stockLabels: {
    in_stock: "In stock",
    low_stock: "Low stock",
    preorder: "Pre-order",
    out_of_stock: "Out of stock",
  } satisfies Record<StockStatus, string>,

  /** Both currencies are explicit. Set to 0 for free delivery. */
  shipping: {
    flatNGN: 0,
    flatUSDC: 0,
    note: "Delivery is arranged with you after your order is confirmed.",
  },

  hero: {
    primaryCta: { label: "Shop the collection", href: "/shop" },
    secondaryCta: { label: "Our story", href: "/about" },
  },

  featured: {
    eyebrow: "The Collection",
    title: "Quietly radiant essentials",
    intro: "A small, considered range for skin that feels soft and looks luminous.",
    cta: { label: "View all products", href: "/shop" },
  },

  story: {
    eyebrow: "Our Philosophy",
    title: "Beauty that speaks softly",
    body: [
      "Starmius Skincare is built on a simple belief: confidence is quiet. Our products are made to elevate your natural radiance, never to mask it.",
      "Every formula and every detail is chosen with care, so your routine feels calm, refined and effortless.",
    ],
    cta: { label: "Read our story", href: "/about" },
    image: "/brand/portrait-2.jpeg",
    imageAlt: "Portrait of a woman with glowing skin",
  },

  shop: {
    eyebrow: "Shop",
    title: "The Collection",
    intro: "Face, body and enhancement essentials.",
    allLabel: "All",
    empty: "Nothing here yet. Please check back soon.",
  },

  about: {
    eyebrow: "About",
    title: "Radiance, refined",
    intro: "Starmius Skincare is a beauty and enhancement brand for people who value calm, confident self care.",
    image: "/brand/portrait-1.jpeg",
    imageAlt: "Portrait of a woman wearing gold jewellery",
    sections: [
      { title: "Our story", body: "Starmius began with a wish for skincare that feels as good as it looks: gentle textures, a soft glow and nothing unnecessary." },
      { title: "Our approach", body: "We keep the range small and the standards high. Each product earns its place in your routine." },
    ],
    values: [
      { title: "Calm", body: "Simple routines and gentle textures." },
      { title: "Luminous", body: "A soft, natural glow." },
      { title: "Considered", body: "Fewer products, chosen with care." },
    ],
  },

  contactPage: {
    eyebrow: "Contact",
    title: "We would love to hear from you",
    intro: "Questions about a product, an order or delivery? Reach us any way you prefer.",
    socialsTitle: "Follow Starmius",
    whatsappCta: "Message us on WhatsApp",
  },

  cart: { title: "Your cart", empty: "Your cart is empty.", continue: "Continue shopping" },

  auth: {
    title: "Welcome",
    intro: "Sign in, or continue as a guest. No account is needed to shop.",
    guestLabel: "Continue as guest",
    emailTitle: "Continue with email",
    googleLabel: "Continue with Google",
  },

  footer: {
    blurb: "Beauty & Enhancement Products",
    legal: "© {year} Starmius Skincare. All rights reserved.",
  },
};
