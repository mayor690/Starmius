import { createHmac, timingSafeEqual } from "node:crypto";
import { cleanCustomer } from "@/lib/order-message";
import { recordPaidOrder } from "@/lib/stats";

/**
 * Paystack calls this when a payment succeeds, so sales show on the Stats page even if the customer
 * never returns to the site. Add https://YOUR-SITE/api/paystack/webhook as the webhook URL in Paystack.
 */
export async function POST(req: Request) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return new Response("Not configured", { status: 503 });

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", key).update(raw).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Invalid signature", { status: 401 });

  try {
    const evt = JSON.parse(raw) as {
      event?: string;
      data?: { reference?: string; amount?: number; currency?: string; paid_at?: string; metadata?: { customer?: unknown; shippingNGN?: number; items?: { slug?: string; qty?: number }[] } | null };
    };
    const d = evt.data;
    if (evt.event === "charge.success" && d?.reference && d.currency === "NGN" && typeof d.amount === "number") {
      const customer = cleanCustomer(d.metadata?.customer);
      const items = (d.metadata?.items ?? []).filter((i): i is { slug: string; qty: number } => typeof i.slug === "string" && typeof i.qty === "number");
      await recordPaidOrder({ ref: d.reference, amountNGN: Math.round(d.amount / 100), shippingNGN: Number(d.metadata?.shippingNGN) || 0, state: customer.state, city: customer.city, items, at: d.paid_at });
    }
  } catch { /* acknowledge anyway so Paystack does not retry forever */ }
  return new Response("ok");
}
