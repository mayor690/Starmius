import type { Metadata } from "next";
import Link from "next/link";
import { checkoutConfig } from "@/data/checkout";
import { ClearCart } from "@/components/clear-cart";
import { WhatsAppNotify } from "@/components/whatsapp-notify";
import { getAllProducts, getShipping, getWhatsappBase } from "@/lib/store";
import type { ShippingConfig } from "@/lib/shipping";
import type { Product } from "@/lib/types";
import { priceCart } from "@/lib/pricing";
import { buildOrderMessage, cleanCustomer, formatNGN, whatsappUrl } from "@/lib/order-message";

export const metadata: Metadata = { title: "Order status", robots: { index: false } };

type Outcome = "success" | "pending" | "failure";

interface Verified {
  amountNGN: number;
  shippingNGN: number;
  customer: unknown;
  items: { slug: string; qty: number }[];
}

async function verifyPaystack(reference: string): Promise<Verified | null> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number; metadata?: { customer?: unknown; shippingNGN?: number; items?: { slug?: string; qty?: number }[] } | null };
    };
    if (data.status !== true || data.data?.status !== "success") return null;
    const items = (data.data.metadata?.items ?? [])
      .filter((i): i is { slug: string; qty: number } => typeof i.slug === "string" && typeof i.qty === "number");
    return { amountNGN: Math.round((data.data.amount ?? 0) / 100), shippingNGN: Number(data.data.metadata?.shippingNGN) || 0, customer: data.data.metadata?.customer, items };
  } catch {
    return null;
  }
}

/** Builds the owner's WhatsApp message from Paystack's own record of the payment. */
function nairaWhatsappUrl(reference: string, v: Verified, catalog: Product[], shipping: ShippingConfig, base: string | null): string | null {
  const priced = priceCart(v.items, catalog, shipping);
  const names = priced.items.map((i) => ({ name: i.product.name, qty: i.qty, total: formatNGN(i.lineNGN) }));
  // Fall back to raw slugs if a product was removed from the catalog after payment.
  const items = names.length ? names : v.items.map((i) => ({ name: catalog.find((p) => p.slug === i.slug)?.name ?? i.slug, qty: i.qty }));
  const message = buildOrderMessage({
    method: "naira",
    reference,
    customer: cleanCustomer(v.customer),
    items,
    // The fee charged at payment time, not today's settings.
    delivery: v.shippingNGN ? formatNGN(v.shippingNGN) : "Free",
    totalPaid: formatNGN(v.amountNGN),
  });
  return whatsappUrl(message, base);
}

export default async function CompletePage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string; method?: string }> }) {
  const q = await searchParams;
  const reference = q.reference ?? q.trxref;

  let outcome: Outcome = "failure";
  let waUrl: string | null = null;
  if (reference) {
    const verified = await verifyPaystack(reference);
    if (verified) {
      outcome = "success";
      waUrl = nairaWhatsappUrl(reference, verified, await getAllProducts(), await getShipping(), await getWhatsappBase());
    }
  } else if (q.method === "usdc") outcome = "pending";

  const copy = checkoutConfig[outcome];
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 px-6 py-32 text-center">
      {outcome !== "failure" && <ClearCart />}
      <h1 className="gold-text font-display text-5xl font-medium">{copy.title}</h1>
      <span className="h-px w-12 bg-champagne-500" aria-hidden="true" />
      <p className="leading-relaxed text-muted">{copy.body}</p>
      {reference && outcome === "success" && <p className="text-xs tracking-[0.25em] text-champagne-700">{reference}</p>}
      {outcome === "success" && waUrl && reference && <WhatsAppNotify url={waUrl} reference={reference} />}
      {outcome === "pending" && <WhatsAppNotify />}
      <Link href={copy.cta.href} className="btn btn-outline">{copy.cta.label}</Link>
    </div>
  );
}
