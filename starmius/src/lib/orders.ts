import "server-only";
import type { OrderCustomer } from "./order-message";
import { getDb, readDoc, writeDoc, type D1Database } from "./storage";

/**
 * Every order after checkout (bank transfer, USDC, USDT and Paystack). The owner or payments staff confirm
 * the payment, then move the order through delivery. A bank reference or transaction hash is used once only.
 */

export type OrderMethod = "bank" | "usdc" | "usdt" | "paystack";
export type Fulfilment = "pending" | "confirmed" | "packing" | "shipped" | "ready_for_pickup" | "delivered" | "cancelled";
/** Statuses the team can set on an order that has been paid. */
export const SETTABLE: Fulfilment[] = ["confirmed", "packing", "shipped", "ready_for_pickup", "delivered"];

export interface OrderItem { slug: string; name: string; qty: number; lineNGN: number; lineUSD?: number }
export interface Order {
  ref: string;
  at: string;
  method: OrderMethod;
  /** Payment status. */
  status: "pending" | "paid" | "cancelled";
  amountNGN: number;
  shippingNGN: number;
  /** Crypto orders: the dollar amount to pay, in the chosen token. */
  amountUSD?: number;
  shippingUSD?: number;
  token?: "USDC" | "USDT";
  chain?: string;
  customer: OrderCustomer;
  items: OrderItem[];
  senderName?: string;
  /** What the customer quoted (transfer reference or transaction hash). Not trusted. */
  customerRef?: string;
  paid?: { at: string; bankRef: string; receivedNGN?: number; receivedUSD?: number; by?: string };
  cancelled?: { at: string; by: string };
  fulfilment: { status: Fulfilment; at: string; note?: string; by?: string; history: { status: Fulfilment; at: string; by?: string }[] };
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

const refKey = (r: string) => r.trim().toLowerCase();

/** Older saved orders have no method or delivery status. Fill those in when reading. */
function normalise(raw: unknown): Order {
  const o = raw as Partial<Order> & { customerTransferRef?: string };
  const base = o as Order;
  const status = base.status;
  const fallback: Fulfilment = status === "paid" ? "confirmed" : status === "cancelled" ? "cancelled" : "pending";
  return {
    ...base,
    method: base.method ?? "bank",
    customerRef: base.customerRef ?? o.customerTransferRef,
    fulfilment: base.fulfilment ?? { status: fallback, at: base.paid?.at ?? base.at, history: [] },
  };
}

const parse = (data: string) => normalise(JSON.parse(data));

// ---- Local files (one process) ------------------------------------------------

interface LocalFile { orders: Order[]; refs: Record<string, string> }
const empty = (): LocalFile => ({ orders: [], refs: {} });
const DOC = "bank-orders";

let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

export function newFulfilment(status: Fulfilment, at: string, by?: string): Order["fulfilment"] {
  return { status, at, ...(by ? { by } : {}), history: [{ status, at, ...(by ? { by } : {}) }] };
}

// ---- Reading and creating -----------------------------------------------------

/** Saves a new order. Sending the same reference again returns the first one unchanged. */
export async function createOrder(order: Order): Promise<Order> {
  const db = await getDb();
  if (db) {
    await db.prepare("INSERT OR IGNORE INTO bank_orders (ref, at, status, data) VALUES (?, ?, ?, ?)").bind(order.ref, order.at, order.status, JSON.stringify(order)).run();
    return (await getOrder(order.ref)) ?? order;
  }
  return locked(async () => {
    const f = await readDoc<LocalFile>(DOC, empty);
    const existing = f.orders.find((o) => o.ref === order.ref);
    if (existing) return normalise(existing);
    f.orders.push(order);
    await writeDoc(DOC, f);
    return order;
  });
}

export async function getOrder(ref: string): Promise<Order | null> {
  const db = await getDb();
  if (db) {
    const row = await db.prepare("SELECT data FROM bank_orders WHERE ref = ?").bind(ref).first<{ data: string }>();
    return row ? parse(row.data) : null;
  }
  const found = (await readDoc<LocalFile>(DOC, empty)).orders.find((o) => o.ref === ref);
  return found ? normalise(found) : null;
}

/** Newest first. */
export async function listOrders(limit = 400): Promise<Order[]> {
  const db = await getDb();
  if (db) {
    const r = await db.prepare("SELECT data FROM bank_orders ORDER BY at DESC LIMIT ?").bind(limit).all<{ data: string }>();
    return (r.results ?? []).map((x) => parse(x.data));
  }
  return (await readDoc<LocalFile>(DOC, empty)).orders.map(normalise).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/** What a customer may see about their own order. No personal details. */
export interface PublicStatus { ref: string; method: OrderMethod; payment: Order["status"]; status: Fulfilment; at: string; paidAt?: string; updatedAt: string; note?: string }

export async function publicStatus(ref: string): Promise<PublicStatus | null> {
  const o = await getOrder(ref);
  if (!o) return null;
  return {
    ref: o.ref, method: o.method, payment: o.status, status: o.fulfilment.status, at: o.at,
    ...(o.paid ? { paidAt: o.paid.at } : {}), updatedAt: o.fulfilment.at, ...(o.fulfilment.note ? { note: o.fulfilment.note } : {}),
  };
}

// ---- Confirming payment -------------------------------------------------------

export interface ReceiveInput { ref: string; reference: string; received: number; force: boolean; by: string }

/** Marks an order as paid after the bank alert or the on-chain transfer has been checked. */
export async function markReceived(input: ReceiveInput): Promise<Outcome<Order>> {
  const reference = input.reference.trim();
  const order = await getOrder(input.ref);
  if (!order) return { ok: false, error: "No order has that reference. Check the reference the customer used." };
  if (order.status === "paid") return { ok: false, error: `${order.ref} is already marked as received.` };
  if (order.status === "cancelled") return { ok: false, error: `${order.ref} was cancelled. Ask the customer to place a new order.` };

  const crypto = order.method === "usdc" || order.method === "usdt";
  if (crypto) {
    if (!/^[A-Za-z0-9]{20,100}$/.test(reference)) return { ok: false, error: "Enter the transaction hash (letters and numbers only, no spaces)." };
    if (!Number.isFinite(input.received) || input.received <= 0) return { ok: false, error: `Enter the ${order.token ?? "USD"} amount that arrived.` };
    const expected = order.amountUSD ?? 0;
    if (Math.abs(input.received - expected) >= 0.005 && !input.force) {
      return { ok: false, error: `The amount received is ${input.received < expected ? "less" : "more"} than the order total of ${expected.toFixed(2)} ${order.token ?? ""}. Tick "Accept a different amount" if you want to continue.` };
    }
  } else {
    if (reference.length < 4 || reference.length > 80) return { ok: false, error: "Enter the bank's own reference or session ID for this credit (4 to 80 characters)." };
    if (!Number.isInteger(input.received) || input.received <= 0) return { ok: false, error: "Enter the amount that arrived, in whole naira." };
    if (input.received !== order.amountNGN && !input.force) {
      return { ok: false, error: `The amount received is ${input.received < order.amountNGN ? "less" : "more"} than the order total. Tick "Accept a different amount" if you want to continue.` };
    }
  }

  const at = new Date().toISOString();
  const paid: NonNullable<Order["paid"]> = { at, bankRef: reference, by: input.by, ...(crypto ? { receivedUSD: input.received } : { receivedNGN: input.received }) };
  const next: Order = { ...order, status: "paid", paid, fulfilment: newFulfilment("confirmed", at, input.by) };
  const key = refKey(reference);

  const db = await getDb();
  if (db) return markReceivedD1(db, next, key, crypto);

  return locked(async () => {
    const f = await readDoc<LocalFile>(DOC, empty);
    if (f.refs[key]) return { ok: false, error: `That ${crypto ? "transaction hash" : "bank reference"} was already used for ${f.refs[key]}. A payment can only be counted once.` } as const;
    const idx = f.orders.findIndex((o) => o.ref === next.ref);
    if (idx === -1 || f.orders[idx]?.status !== "pending") return { ok: false, error: "This order is no longer waiting for payment." } as const;
    f.orders[idx] = next;
    f.refs[key] = next.ref;
    await writeDoc(DOC, f);
    return { ok: true, value: next } as const;
  });
}

async function markReceivedD1(db: D1Database, next: Order, key: string, crypto: boolean): Promise<Outcome<Order>> {
  try {
    // One transaction: the reference is claimed and the order updated together, or neither happens.
    await db.batch([
      db.prepare("INSERT INTO bank_refs (key, order_ref) VALUES (?, ?)").bind(key, next.ref),
      db.prepare("UPDATE bank_orders SET status = 'paid', data = ? WHERE ref = ? AND status = 'pending'").bind(JSON.stringify(next), next.ref),
    ]);
    return { ok: true, value: next };
  } catch (e) {
    if (/unique|constraint/i.test(e instanceof Error ? e.message : String(e))) {
      const row = await db.prepare("SELECT order_ref FROM bank_refs WHERE key = ?").bind(key).first<{ order_ref: string }>();
      return { ok: false, error: `That ${crypto ? "transaction hash" : "bank reference"} was already used${row ? ` for ${row.order_ref}` : ""}. A payment can only be counted once.` };
    }
    throw e;
  }
}

export async function cancelOrder(ref: string, by: string): Promise<Outcome<Order>> {
  const order = await getOrder(ref);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "pending") return { ok: false, error: `Only orders waiting for payment can be cancelled (this one is ${order.status}).` };
  const at = new Date().toISOString();
  const next: Order = { ...order, status: "cancelled", cancelled: { at, by }, fulfilment: newFulfilment("cancelled", at, by) };
  const db = await getDb();
  if (db) {
    await db.prepare("UPDATE bank_orders SET status = 'cancelled', data = ? WHERE ref = ? AND status = 'pending'").bind(JSON.stringify(next), ref).run();
    return { ok: true, value: next };
  }
  return locked(async () => {
    const f = await readDoc<LocalFile>(DOC, empty);
    const idx = f.orders.findIndex((o) => o.ref === ref);
    if (idx === -1 || f.orders[idx]?.status !== "pending") return { ok: false, error: "This order is no longer waiting for payment." } as const;
    f.orders[idx] = next;
    await writeDoc(DOC, f);
    return { ok: true, value: next } as const;
  });
}

// ---- Delivery status ----------------------------------------------------------

export interface FulfilInput { ref: string; status: Fulfilment; note?: string; by: string }

/** Moves a paid order through confirmed, packing, shipped, ready for pickup and delivered. */
export async function setFulfilment(input: FulfilInput): Promise<Outcome<Order>> {
  if (!SETTABLE.includes(input.status)) return { ok: false, error: "Unknown delivery status." };
  const order = await getOrder(input.ref);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "paid") return { ok: false, error: "Confirm the payment first. Delivery status can only change on a paid order." };
  const at = new Date().toISOString();
  const note = (input.note ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 160); // eslint-disable-line no-control-regex
  const same = order.fulfilment.status === input.status;
  const history = same ? order.fulfilment.history : [...order.fulfilment.history, { status: input.status, at, by: input.by }].slice(-20);
  const next: Order = { ...order, fulfilment: { status: input.status, at: same && !note ? order.fulfilment.at : at, by: input.by, ...(note ? { note } : {}), history } };

  const db = await getDb();
  if (db) {
    await db.prepare("UPDATE bank_orders SET data = ? WHERE ref = ?").bind(JSON.stringify(next), next.ref).run();
    return { ok: true, value: next };
  }
  return locked(async () => {
    const f = await readDoc<LocalFile>(DOC, empty);
    const idx = f.orders.findIndex((o) => o.ref === next.ref);
    if (idx === -1) return { ok: false, error: "Order not found." } as const;
    f.orders[idx] = next;
    await writeDoc(DOC, f);
    return { ok: true, value: next } as const;
  });
}
