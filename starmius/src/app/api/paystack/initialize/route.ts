import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { site } from "@/data/site";
import { priceCart, type CartLine } from "@/lib/pricing";
import { cleanCustomer } from "@/lib/order-message";
import { getAllProducts, getPaystackOn, getShipping } from "@/lib/store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !(await getPaystackOn())) return json({ error: "Card payments are not available right now. Please choose another way to pay." }, 503);

  const body = (await req.json().catch(() => null)) as {
    items?: CartLine[];
    customer?: Record<string, string>;
  } | null;

  const customer = cleanCustomer(body?.customer);
  const email = customer.email;
  if (!body?.items?.length || !EMAIL.test(email)) return json({ error: "Invalid order details." }, 400);

  // Totals are always recomputed on the server from the data files.
  // Delivery is charged by the customer's state, using the fees saved in the admin dashboard.
  if (!customer.state) return json({ error: "Please select your state." }, 400);
  const priced = priceCart(body.items, await getAllProducts(), await getShipping(), customer.state, customer.city);
  if (priced.unavailable.length || !priced.items.length) {
    return json({ error: "Some items are no longer available." }, 400);
  }

  const reference = `STM-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      amount: priced.totalNGN * 100,
      currency: "NGN",
      reference,
      callback_url: `${site.url}/checkout/complete`,
      metadata: {
        customer,
        items: priced.items.map((i) => ({ slug: i.product.slug, qty: i.qty })),
        shippingNGN: priced.shippingNGN,
      },
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    status?: boolean;
    data?: { authorization_url?: string };
  } | null;

  if (!res.ok || !data?.status || !data.data?.authorization_url) {
    return json({ error: "Could not start payment. Please try again." }, 502);
  }
  return json({ url: data.data.authorization_url, reference });
}
