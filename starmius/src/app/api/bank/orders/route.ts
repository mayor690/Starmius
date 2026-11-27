import { NextResponse } from "next/server";
import { clientIp, sameOrigin } from "@/lib/admin-auth";
import { createBankOrder, type BankOrder } from "@/lib/bank";
import { cleanCustomer } from "@/lib/order-message";
import { priceCart, type CartLine } from "@/lib/pricing";
import { getAllProducts, getBank, getShipping } from "@/lib/store";

/**
 * Public. Records a bank transfer order when the customer confirms on WhatsApp. The amount is always worked out
 * here from the saved prices and delivery fees, never taken from the browser.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const REF = /^STM-[A-Z0-9]{6,14}$/;
const hits = new Map<string, { n: number; start: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > 3_600_000) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { n: 1, start: now });
    return false;
  }
  h.n += 1;
  return h.n > 12;
}

const text = (v: unknown, max: number) =>
  // eslint-disable-next-line no-control-regex
  (typeof v === "string" ? v : "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  if (limited(clientIp(req))) return json({ error: "Too many orders from this connection. Please try again later." }, 429);

  const bank = await getBank();
  if (!bank.enabled) return json({ error: "Bank transfer is not available right now." }, 503);

  const body = (await req.json().catch(() => null)) as { ref?: unknown; items?: CartLine[]; customer?: unknown; senderName?: unknown; transferRef?: unknown } | null;
  const ref = typeof body?.ref === "string" ? body.ref.trim().toUpperCase() : "";
  if (!REF.test(ref) || !Array.isArray(body?.items) || !body.items.length || body.items.length > 30) return json({ error: "Invalid order." }, 400);

  const customer = cleanCustomer(body.customer);
  if (!customer.fullName || !customer.phone || !customer.address || !customer.city || !customer.state) {
    return json({ error: "Please fill in your name, phone, address, city and state." }, 400);
  }

  const lines = body.items.filter((l): l is CartLine => typeof l?.slug === "string" && typeof l?.qty === "number");
  const priced = priceCart(lines, await getAllProducts(), await getShipping(), customer.state, customer.city);
  if (priced.unavailable.length || !priced.items.length) return json({ error: "Some items are no longer available. Please check your cart." }, 400);

  const order: BankOrder = {
    ref, at: new Date().toISOString(), status: "pending",
    amountNGN: priced.totalNGN, shippingNGN: priced.shippingNGN, customer,
    items: priced.items.map((i) => ({ slug: i.product.slug, name: i.product.name, qty: i.qty, lineNGN: i.lineNGN })),
    ...(text(body.senderName, 100) ? { senderName: text(body.senderName, 100) } : {}),
    ...(text(body.transferRef, 80) ? { customerTransferRef: text(body.transferRef, 80) } : {}),
  };
  try {
    const saved = await createBankOrder(order);
    return json({ ref: saved.ref, amountNGN: saved.amountNGN, shippingNGN: saved.shippingNGN, items: saved.items.map((i) => ({ name: i.name, qty: i.qty, lineNGN: i.lineNGN })) });
  } catch {
    return json({ error: "We could not record your order. Please try again." }, 500);
  }
}
