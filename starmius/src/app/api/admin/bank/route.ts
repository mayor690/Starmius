import { NextResponse } from "next/server";
import { getAdminSession, requireAdmin } from "@/lib/admin-auth";
import { cancelBankOrder, listBankOrders, markReceived } from "@/lib/bank";
import { recordPaidOrder } from "@/lib/stats";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Owner and payments staff may both work here. Cancelling and accepting a different amount stay with the owner. */
export async function GET(req: Request) {
  const denied = await requireAdmin(req, "any");
  if (denied) return denied;
  return json({ orders: await listBankOrders() });
}

/** Mark an order received from a bank alert, or cancel it. */
export async function POST(req: Request) {
  const denied = await requireAdmin(req, "any");
  if (denied) return denied;
  const session = await getAdminSession();
  const owner = session?.role === "owner";
  const by = session?.name ?? "Unknown";
  const b = (await req.json().catch(() => null)) as { action?: unknown; ref?: unknown; bankRef?: unknown; receivedNGN?: unknown; force?: unknown } | null;
  const ref = typeof b?.ref === "string" ? b.ref.trim().toUpperCase() : "";
  if (!ref) return json({ error: "Enter the order reference." }, 400);

  try {
    if (b?.action === "cancel") {
      if (!owner) return json({ error: "Only the owner can cancel an order." }, 403);
      const r = await cancelBankOrder(ref, by);
      return r.ok ? json({ order: r.value }) : json({ error: r.error }, 400);
    }
    if (b?.action !== "receive") return json({ error: "Unknown action." }, 400);

    const r = await markReceived({
      ref,
      bankRef: typeof b.bankRef === "string" ? b.bankRef : "",
      receivedNGN: Math.round(Number(b.receivedNGN)),
      force: owner && b.force === true,
      by,
    });
    if (!r.ok) return json({ error: r.error }, 400);

    // Counts as a sale on the Stats page. Safe to repeat: each reference is stored once.
    const o = r.value;
    await recordPaidOrder({
      ref: o.ref, method: "bank", amountNGN: o.paid?.receivedNGN ?? o.amountNGN, shippingNGN: o.shippingNGN,
      state: o.customer.state, city: o.customer.city, items: o.items.map((i) => ({ slug: i.slug, qty: i.qty })), at: o.paid?.at,
    }).catch(() => undefined);
    return json({ order: o });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not save." }, 500);
  }
}
