import { formatNGN, formatUSDC } from "./format";

/** One WhatsApp format for every paid order (Naira and USDC). */

export interface OrderCustomer {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  notes: string;
}

export interface OrderMessageItem {
  name: string;
  qty: number;
  /** Already formatted line total, e.g. "₦25,000". */
  total?: string;
}

export interface OrderMessageInput {
  method: "naira" | "usdc";
  reference: string;
  customer: OrderCustomer;
  items: OrderMessageItem[];
  /** Already formatted, e.g. "₦2,500". Optional. */
  delivery?: string;
  /** Already formatted amount the customer paid. */
  totalPaid: string;
  /** USDC only. */
  chain?: string;
  hash?: string;
}

const LIMITS: Record<keyof OrderCustomer, number> = {
  fullName: 120, email: 160, phone: 40, address: 300, city: 100, state: 100, notes: 500,
};

/** Keeps only known fields, trims them, strips control characters and caps length. */
export function cleanCustomer(raw: unknown): OrderCustomer {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = {} as OrderCustomer;
  for (const key of Object.keys(LIMITS) as (keyof OrderCustomer)[]) {
    const v = typeof src[key] === "string" ? (src[key] as string) : "";
    // eslint-disable-next-line no-control-regex
    out[key] = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, LIMITS[key]);
  }
  return out;
}

export function buildOrderMessage(o: OrderMessageInput): string {
  const c = o.customer;
  const dash = (v: string) => v || "-";
  const paidVia = o.method === "naira" ? "Naira (Paystack)" : `USDC${o.chain ? ` on ${o.chain}` : ""}`;

  const lines: string[] = [
    "*NEW STARMIUS ORDER*",
    o.method === "naira" ? "Payment status: PAID" : "Payment status: USDC sent, please verify on chain",
    "",
    "*Order*",
    `Reference: ${o.reference}`,
    `Paid via: ${paidVia}`,
  ];
  if (o.method === "usdc" && o.hash) lines.push(`Transaction: ${o.hash}`);
  lines.push(
    "",
    "*Customer*",
    `Full name: ${dash(c.fullName)}`,
    `Email: ${dash(c.email)}`,
    `Phone: ${dash(c.phone)}`,
    "",
    "*Delivery*",
    `Address: ${dash(c.address)}`,
    `City: ${dash(c.city)}`,
    `State: ${dash(c.state)}`,
    `Notes: ${c.notes || "None"}`,
    "",
    "*Products*",
    ...o.items.map((i, n) => `${n + 1}. ${i.name} x ${i.qty}${i.total ? ` (${i.total})` : ""}`),
  );
  if (o.delivery) lines.push(`Delivery fee: ${o.delivery}`);
  lines.push("", `*Total paid: ${o.totalPaid}*`);
  return lines.join("\n");
}

/** WhatsApp link to the business number. `base` is the WhatsApp link saved in the admin dashboard. */
export function whatsappUrl(message: string, base: string | null): string | null {
  return base ? `${base}?text=${encodeURIComponent(message)}` : null;
}

export { formatNGN, formatUSDC };
