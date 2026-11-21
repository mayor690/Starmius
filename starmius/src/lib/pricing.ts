import { site } from "@/data/site";
import { isPurchasable } from "./stock";
import { round2 } from "./format";
import { shippingFee, type ShippingConfig } from "./shipping";
import type { Product } from "./types";

export interface CartLine {
  slug: string;
  qty: number;
}

export interface PricedLine {
  product: Product;
  qty: number;
  lineNGN: number;
  lineUSDC: number;
}

export interface PricedCart {
  items: PricedLine[];
  unavailable: string[];
  subtotalNGN: number;
  subtotalUSDC: number;
  shippingNGN: number;
  shippingUSDC: number;
  /** False until a delivery state is chosen (the cart page). Totals then exclude delivery. */
  shippingKnown: boolean;
  /** Zone name when a zone fee applies. */
  shippingZone?: string;
  totalNGN: number;
  totalUSDC: number;
}

/** Shared by the cart UI and the server payment routes, so totals always agree. */
export function priceCart(lines: CartLine[], catalog: Product[], shipping: ShippingConfig, state?: string, city?: string): PricedCart {
  const items: PricedLine[] = [];
  const unavailable: string[] = [];

  for (const line of lines) {
    const product = catalog.find((p) => p.slug === line.slug);
    if (!product || !isPurchasable(product.stock)) {
      unavailable.push(line.slug);
      continue;
    }
    const cap = typeof product.quantity === "number" ? Math.max(1, Math.min(site.maxQty, product.quantity)) : site.maxQty;
    const qty = Math.min(Math.max(Math.floor(line.qty), 1), cap);
    items.push({
      product,
      qty,
      lineNGN: product.priceNGN * qty,
      lineUSDC: round2(product.priceUSDC * qty),
    });
  }

  const subtotalNGN = items.reduce((s, i) => s + i.lineNGN, 0);
  const subtotalUSDC = round2(items.reduce((s, i) => s + i.lineUSDC, 0));
  const hasItems = items.length > 0;
  const shippingKnown = hasItems && Boolean(state);
  const fee = shippingKnown ? shippingFee(shipping, state, city) : { ngn: 0, usdc: 0, zone: undefined };
  const shippingNGN = fee.ngn;
  const shippingUSDC = fee.usdc;

  return {
    items,
    unavailable,
    subtotalNGN,
    subtotalUSDC,
    shippingNGN,
    shippingUSDC,
    shippingKnown,
    shippingZone: fee.zone,
    totalNGN: subtotalNGN + shippingNGN,
    totalUSDC: round2(subtotalUSDC + shippingUSDC),
  };
}
