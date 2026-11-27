import "server-only";
import type { OrderCustomer } from "./order-message";
import { getDb, readDoc, writeDoc, type D1Database } from "./storage";

/**
 * Bank transfer orders. A customer confirms an order on WhatsApp, we keep a record here, and the owner
 * marks it received when the bank alert arrives. A bank reference (session ID) can be used only once.
 */

export interface BankOrderItem { slug: string; name: string; qty: number; lineNGN: number }
export interface BankOrder {
  ref: string;
  at: string;
  status: "pending" | "paid" | "cancelled";
  amountNGN: number;
  shippingNGN: number;
  customer: OrderCustomer;
  items: BankOrderItem[];
  /** Name on the account the customer paid from, if they gave it. */
  senderName?: string;
  /** The transfer reference or session ID the customer quoted, if any. Not trusted. */
  customerTransferRef?: string;
  paid?: { at: string; bankRef: string; receivedNGN: number; /** Who marked it received. */ by?: string };
  cancelled?: { at: string; by: string };
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

const refKey = (bankRef: string) => bankRef.trim().toLowerCase();

// ---- Local files (one process) ------------------------------------------------

interface LocalFile { orders: BankOrder[]; refs: Record<string, string> }
const empty = (): LocalFile => ({ orders: [], refs: {} });

let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

// ---- Public API ---------------------------------------------------------------

/** Saves a new order. Sending the same reference again returns the first one unchanged. */
export async function createBankOrder(order: BankOrder): Promise<BankOrder> {
  const db = await getDb();
  if (db) {
    await db.prepare("INSERT OR IGNORE INTO bank_orders (ref, at, status, data) VALUES (?, ?, ?, ?)").bind(order.ref, order.at, order.status, JSON.stringify(order)).run();
    return (await getBankOrder(order.ref)) ?? order;
  }
  return locked(async () => {
    const f = await readDoc<LocalFile>("bank-orders", empty);
    const existing = f.orders.find((o) => o.ref === order.ref);
    if (existing) return existing;
    f.orders.push(order);
    await writeDoc("bank-orders", f);
    return order;
  });
}

export async function getBankOrder(ref: string): Promise<BankOrder | null> {
  const db = await getDb();
  if (db) {
    const row = await db.prepare("SELECT data FROM bank_orders WHERE ref = ?").bind(ref).first<{ data: string }>();
    return row ? (JSON.parse(row.data) as BankOrder) : null;
  }
  return (await readDoc<LocalFile>("bank-orders", empty)).orders.find((o) => o.ref === ref) ?? null;
}

/** Newest first. */
export async function listBankOrders(limit = 300): Promise<BankOrder[]> {
  const db = await getDb();
  if (db) {
    const r = await db.prepare("SELECT data FROM bank_orders ORDER BY at DESC LIMIT ?").bind(limit).all<{ data: string }>();
    return (r.results ?? []).map((x) => JSON.parse(x.data) as BankOrder);
  }
  return [...(await readDoc<LocalFile>("bank-orders", empty)).orders].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export interface ReceiveInput { ref: string; bankRef: string; receivedNGN: number; force: boolean; by: string }

/** Marks an order as paid after the owner has seen the bank alert. */
export async function markReceived(input: ReceiveInput): Promise<Outcome<BankOrder>> {
  const bankRef = input.bankRef.trim();
  if (bankRef.length < 4 || bankRef.length > 80) return { ok: false, error: "Enter the bank's own reference or session ID for this credit (4 to 80 characters)." };
  if (!Number.isInteger(input.receivedNGN) || input.receivedNGN <= 0) return { ok: false, error: "Enter the amount that arrived, in whole naira." };

  const order = await getBankOrder(input.ref);
  if (!order) return { ok: false, error: "No order has that reference. Check the reference the customer used." };
  if (order.status === "paid") return { ok: false, error: `${order.ref} is already marked as received.` };
  if (order.status === "cancelled") return { ok: false, error: `${order.ref} was cancelled. Ask the customer to place a new order.` };
  if (input.receivedNGN !== order.amountNGN && !input.force) {
    const word = input.receivedNGN < order.amountNGN ? "less" : "more";
    return { ok: false, error: `The amount received is ${word} than the order total. Tick "Accept a different amount" if you want to continue.` };
  }

  const paid = { at: new Date().toISOString(), bankRef, receivedNGN: input.receivedNGN, by: input.by };
  const next: BankOrder = { ...order, status: "paid", paid };
  const key = refKey(bankRef);

  const db = await getDb();
  if (db) return markReceivedD1(db, next, key);

  return locked(async () => {
    const f = await readDoc<LocalFile>("bank-orders", empty);
    if (f.refs[key]) return { ok: false, error: `That bank reference was already used for ${f.refs[key]}. A bank credit can only be counted once.` } as const;
    const idx = f.orders.findIndex((o) => o.ref === next.ref);
    if (idx === -1 || f.orders[idx]?.status !== "pending") return { ok: false, error: "This order is no longer waiting for payment." } as const;
    f.orders[idx] = next;
    f.refs[key] = next.ref;
    await writeDoc("bank-orders", f);
    return { ok: true, value: next } as const;
  });
}

async function markReceivedD1(db: D1Database, next: BankOrder, key: string): Promise<Outcome<BankOrder>> {
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
      return { ok: false, error: `That bank reference was already used${row ? ` for ${row.order_ref}` : ""}. A bank credit can only be counted once.` };
    }
    throw e;
  }
}

export async function cancelBankOrder(ref: string, by: string): Promise<Outcome<BankOrder>> {
  const order = await getBankOrder(ref);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "pending") return { ok: false, error: `Only orders waiting for payment can be cancelled (this one is ${order.status}).` };
  const next: BankOrder = { ...order, status: "cancelled", cancelled: { at: new Date().toISOString(), by } };
  const db = await getDb();
  if (db) {
    await db.prepare("UPDATE bank_orders SET status = 'cancelled', data = ? WHERE ref = ? AND status = 'pending'").bind(JSON.stringify(next), ref).run();
    return { ok: true, value: next };
  }
  return locked(async () => {
    const f = await readDoc<LocalFile>("bank-orders", empty);
    const idx = f.orders.findIndex((o) => o.ref === ref);
    if (idx === -1 || f.orders[idx]?.status !== "pending") return { ok: false, error: "This order is no longer waiting for payment." } as const;
    f.orders[idx] = next;
    await writeDoc("bank-orders", f);
    return { ok: true, value: next } as const;
  });
}
