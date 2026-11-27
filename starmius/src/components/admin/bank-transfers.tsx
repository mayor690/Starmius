"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { adminApi } from "@/lib/admin-api";
import { formatNGN } from "@/lib/format";
import type { BankOrder } from "@/lib/bank";
import { whatsappNumber } from "@/lib/phone";
import { CopyButton } from "@/components/copy-button";

const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

function thankYouLink(o: BankOrder): string {
  const first = o.customer.fullName.split(/\s+/)[0] || "there";
  const text = `Hello ${first}, we have received your bank transfer of ${formatNGN(o.paid?.receivedNGN ?? o.amountNGN)} for order ${o.ref}. Thank you! We are preparing your order now.`;
  return `https://wa.me/${whatsappNumber(o.customer.phone)}?text=${encodeURIComponent(text)}`;
}

export function BankTransfers({ onPending }: { onPending: (n: number) => void }) {
  const [orders, setOrders] = useState<BankOrder[] | null>(null);
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");
  const [amount, setAmount] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<BankOrder | null>(null);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await adminApi<{ orders: BankOrder[] }>("/api/admin/bank", "GET");
      setOrders(r.orders);
      onPending(r.orders.filter((o) => o.status === "pending").length);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load bank transfers."); }
  }, [onPending]);
  useEffect(() => { void load(); }, [load]);

  const pending = useMemo(() => (orders ?? []).filter((o) => o.status === "pending"), [orders]);
  const paid = useMemo(() => (orders ?? []).filter((o) => o.status === "paid"), [orders]);
  const cancelled = useMemo(() => (orders ?? []).filter((o) => o.status === "cancelled"), [orders]);
  const match = useMemo(() => pending.find((o) => o.ref === ref.trim().toUpperCase()), [pending, ref]);

  function fill(o: BankOrder) {
    setRef(o.ref); setAmount(String(o.amountNGN)); setDone(null); setFormError("");
    document.getElementById("alert-box")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function receive(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setFormError(""); setDone(null);
    try {
      const r = await adminApi<{ order: BankOrder }>("/api/admin/bank", "POST", { action: "receive", ref, bankRef, receivedNGN: Number(amount), force });
      setDone(r.order); setRef(""); setAmount(""); setBankRef(""); setForce(false);
      await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : "Could not save."); }
    setBusy(false);
  }

  async function cancel(o: BankOrder) {
    if (!window.confirm(`Cancel ${o.ref} from ${o.customer.fullName}? Do this only if they will not pay.`)) return;
    try { await adminApi("/api/admin/bank", "POST", { action: "cancel", ref: o.ref }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not cancel."); }
  }

  if (error && !orders) return <p role="alert" className="text-sm text-red-800">{error}</p>;
  if (!orders) return <p className="text-muted">Loading bank transfers</p>;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-medium">Bank transfers</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Customers confirm on WhatsApp after paying. When the bank alert reaches you, match it here. Each bank reference can only be used once, so an alert can never be counted twice.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => void load()}>Refresh</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}

      <form id="alert-box" onSubmit={receive} className="border border-champagne-300/60 bg-ivory-50 p-6">
        <h3 className="font-display text-2xl font-medium">Mark a transfer as received</h3>
        <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="br-ref">Order reference</label>
            <input id="br-ref" required className="field font-mono" placeholder="STM-XXXXXXXX" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} />
          </div>
          <div>
            <label className="field-label" htmlFor="br-amt">Amount that arrived (NGN)</label>
            <input id="br-amt" required type="number" min={1} step={1} className="field" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="br-bank">Bank reference or session ID</label>
            <input id="br-bank" required minLength={4} maxLength={80} className="field font-mono" value={bankRef} onChange={(e) => setBankRef(e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
        </div>
        {match && <p className="mt-4 text-sm text-champagne-700">Matches {match.customer.fullName}, {match.customer.city}, {match.customer.state}. Order total {formatNGN(match.amountNGN)}.</p>}
        {ref && !match && ref.trim().length >= 6 && <p className="mt-4 text-sm text-muted">No waiting order has this reference.</p>}
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input type="checkbox" className="size-4 accent-[#6b4f2a]" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Accept a different amount from the order total
        </label>
        {formError && <p role="alert" className="mt-4 text-sm text-red-800">{formError}</p>}
        {done && (
          <div role="status" className="mt-4 border border-emerald-800/30 bg-emerald-50 p-4 text-sm">
            <p className="font-medium">{done.ref} marked as received ({formatNGN(done.paid?.receivedNGN ?? done.amountNGN)}). It now counts as a sale on the Stats page.</p>
            <a href={thankYouLink(done)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium text-champagne-700 underline underline-offset-4">Tell {done.customer.fullName.split(/\s+/)[0] || "the customer"} on WhatsApp</a>
          </div>
        )}
        <button type="submit" className="btn btn-primary mt-6" disabled={busy}>{busy ? "Saving" : "Mark as received"}</button>
      </form>

      <section aria-labelledby="pending-title">
        <h3 id="pending-title" className="font-display text-2xl font-medium">Waiting for payment ({pending.length})</h3>
        <ul className="mt-4 flex flex-col gap-4">
          {pending.map((o) => (
            <li key={o.ref} className="border border-champagne-300/60 bg-ivory-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-3 font-mono text-lg">{o.ref} <CopyButton text={o.ref} /></p>
                  <p className="text-xs text-muted">{when(o.at)}</p>
                </div>
                <p className="font-display text-2xl tabular-nums">{formatNGN(o.amountNGN)}</p>
              </div>
              <p className="mt-3 text-sm">{o.customer.fullName} &middot; {o.customer.phone} &middot; {o.customer.city}, {o.customer.state}</p>
              <p className="mt-1 text-xs text-muted">{o.items.map((i) => `${i.name} x ${i.qty}`).join(", ")}</p>
              {(o.senderName || o.customerTransferRef) && (
                <p className="mt-1 text-xs text-muted">{o.senderName ? `Paid from: ${o.senderName}. ` : ""}{o.customerTransferRef ? `Customer's reference: ${o.customerTransferRef}` : ""}</p>
              )}
              <div className="mt-4 flex gap-6 text-xs font-medium uppercase tracking-[0.2em]">
                <button type="button" className="text-champagne-700 hover:text-ink" onClick={() => fill(o)}>Match an alert</button>
                <button type="button" className="text-red-800" onClick={() => void cancel(o)}>Cancel</button>
              </div>
            </li>
          ))}
          {!pending.length && <li className="text-sm text-muted">Nothing waiting. New orders appear here when customers confirm a transfer on WhatsApp.</li>}
        </ul>
      </section>

      <section aria-labelledby="paid-title">
        <h3 id="paid-title" className="font-display text-2xl font-medium">Received ({paid.length})</h3>
        <ul className="mt-4 divide-y divide-champagne-300/40 border-y border-champagne-300/40 bg-ivory-50">
          {paid.map((o) => (
            <li key={o.ref} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span><span className="font-mono">{o.ref}</span> &middot; {o.customer.fullName}<span className="block text-xs text-muted">{o.paid ? `${when(o.paid.at)} \u00b7 bank ref ${o.paid.bankRef}` : ""}</span></span>
              <span className="flex items-center gap-4">
                <a href={thankYouLink(o)} target="_blank" rel="noopener noreferrer" className="text-xs font-medium uppercase tracking-[0.2em] text-champagne-700 underline underline-offset-4">WhatsApp</a>
                <span className="font-display text-lg tabular-nums">{formatNGN(o.paid?.receivedNGN ?? o.amountNGN)}</span>
              </span>
            </li>
          ))}
          {!paid.length && <li className="px-4 py-6 text-center text-muted">No transfers received yet.</li>}
        </ul>
      </section>

      {cancelled.length > 0 && (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">Cancelled ({cancelled.length})</summary>
          <ul className="mt-3 flex flex-col gap-1">{cancelled.map((o) => <li key={o.ref}><span className="font-mono">{o.ref}</span> &middot; {o.customer.fullName} &middot; {formatNGN(o.amountNGN)}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
