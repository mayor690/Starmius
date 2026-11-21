"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { checkoutConfig } from "@/data/checkout";
import { payments, type PaymentMethod } from "@/data/payments";
import { site } from "@/data/site";
import { formatUSDC } from "@/lib/format";
import { NIGERIA_STATES, OUTSIDE_NIGERIA } from "@/lib/shipping";
import { priceCart } from "@/lib/pricing";
import { buildOrderMessage, cleanCustomer, whatsappUrl } from "@/lib/order-message";
import { USDC_WA_KEY } from "./whatsapp-notify";
import { track } from "@/lib/track";
import { useAuth } from "./auth-provider";
import { useCart } from "./cart-provider";
import { useCatalog } from "./catalog-provider";
import { CityField } from "./city-field";
import { OrderTotals } from "./order-totals";

const EVM_HASH = /^0x[a-fA-F0-9]{64}$/;
const SOL_SIG = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

export function CheckoutForm() {
  const router = useRouter();
  const { lines, hydrated, clear } = useCart();
  const { session } = useAuth();

  const methods = payments.methods.filter((m) => m.enabled);
  const chains = payments.usdc.chains.filter((c) => c.enabled);

  const [method, setMethod] = useState<PaymentMethod["id"]>(methods[0]?.id ?? "naira");
  const [values, setValues] = useState<Record<string, string>>({});
  const [chainId, setChainId] = useState(chains[0]?.id ?? "");
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session) return;
    setValues((v) => ({
      ...(session.name ? { fullName: session.name } : {}),
      ...(session.email ? { email: session.email } : {}),
      ...v,
    }));
  }, [session]);

  const { whatsappBase, products, shipping } = useCatalog();
  // Delivery fee depends on the chosen state, so totals are recomputed here.
  const priced = useMemo(() => priceCart(lines, products, shipping, values.state, values.city), [lines, products, shipping, values.state, values.city]);
  const chain = useMemo(() => chains.find((c) => c.id === chainId), [chains, chainId]);
  const address = chain ? payments.usdc.receivingAddresses[chain.family] : "";
  const addressReady = address !== "" && !address.startsWith("REPLACE");

  if (!hydrated) return <p className="py-24 text-center text-muted">Loading</p>;
  if (!priced.items.length) {
    return (
      <div className="flex flex-col items-center gap-8 py-24 text-center">
        <p className="text-muted">{site.cart.empty}</p>
        <Link href="/shop" className="btn btn-outline">{site.cart.continue}</Link>
      </div>
    );
  }

  const set = (name: string, v: string) => setValues((p) => ({ ...p, [name]: v }));

  async function payNaira() {
    setBusy(true);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, customer: values }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start payment.");
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment.");
      setBusy(false);
    }
  }

  function confirmUsdc() {
    if (!priced.shippingKnown) { setError("Please select your state so delivery can be added."); return; }
    if (!chain || !addressReady) { setError("USDC payment is not available right now."); return; }
    const valid = chain.family === "evm" ? EVM_HASH.test(hash.trim()) : SOL_SIG.test(hash.trim());
    if (!valid) { setError("Please paste a valid transaction hash for the selected chain."); return; }
    if (!whatsappBase) { setError("WhatsApp contact is not configured."); return; }

    const reference = `STM-${Date.now().toString(36).toUpperCase()}`;
    const message = buildOrderMessage({
      method: "usdc",
      reference,
      customer: cleanCustomer(values),
      items: priced.items.map((i) => ({ name: i.product.name, qty: i.qty, total: formatUSDC(i.lineUSDC) })),
      delivery: formatUSDC(priced.shippingUSDC),
      totalPaid: formatUSDC(priced.totalUSDC),
      chain: chain.name,
      hash: hash.trim(),
    });
    const url = whatsappUrl(message, whatsappBase);
    if (!url) { setError("WhatsApp contact is not configured."); return; }
    try { sessionStorage.setItem(USDC_WA_KEY, url); } catch { /* storage unavailable */ }
    window.open(url, "_blank", "noopener,noreferrer");
    clear();
    router.push("/checkout/complete?method=usdc");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    track({ t: method === "naira" ? "co" : "usdc" });
    if (method === "naira") void payNaira();
    else confirmUsdc();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-16 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-12">
        <section aria-labelledby="details" className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <h2 id="details" className="eyebrow sm:col-span-2">Your details</h2>
          {checkoutConfig.fields.map((f) => (
            <div key={f.name} className={f.half ? "" : "sm:col-span-2"}>
              <label htmlFor={f.name} className="field-label">{f.label}</label>
              {f.type === "state" ? (
                <select id={f.name} name={f.name} required autoComplete={f.autoComplete} className="field" value={values[f.name] ?? ""} onChange={(e) => setValues((p) => ({ ...p, state: e.target.value, city: "" }))}>
                  <option value="" disabled>Select your state</option>
                  {NIGERIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value={OUTSIDE_NIGERIA}>{OUTSIDE_NIGERIA}</option>
                </select>
              ) : f.type === "city" ? (
                <CityField key={values.state ?? ""} id={f.name} state={values.state ?? ""} value={values.city ?? ""} onChange={(v) => set("city", v)} autoComplete={f.autoComplete} />
              ) : f.type === "textarea" ? (
                <textarea id={f.name} name={f.name} rows={2} className="field resize-none" value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} />
              ) : (
                <input id={f.name} name={f.name} type={f.type} required={f.required} autoComplete={f.autoComplete} className="field" value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} />
              )}
            </div>
          ))}
        </section>

        <section aria-labelledby="payment" className="flex flex-col gap-6">
          <h2 id="payment" className="eyebrow">Payment</h2>
          <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-labelledby="payment">
            {methods.map((m) => (
              <label key={m.id} className={`cursor-pointer border p-5 transition-colors ${method === m.id ? "border-champagne-600 bg-ivory-100" : "border-champagne-300/60 hover:border-champagne-500"}`}>
                <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => { setMethod(m.id); setError(""); }} className="sr-only" />
                <span className="block font-display text-xl">{m.label}</span>
                <span className="mt-1 block text-xs tracking-wider text-muted">{m.description}</span>
              </label>
            ))}
          </div>

          {method === "usdc" && (
            <div className="flex flex-col gap-6 border border-champagne-300/50 bg-ivory-100/60 p-6">
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
                {checkoutConfig.usdcSteps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <div>
                <label htmlFor="chain" className="field-label">Chain</label>
                <select id="chain" className="field" value={chainId} onChange={(e) => setChainId(e.target.value)}>
                  {chains.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <p className="field-label">Amount</p>
                <p className="mt-1 font-display text-2xl">{formatUSDC(priced.totalUSDC)}</p>
                {!priced.shippingKnown && <p className="mt-1 text-xs text-muted">Select your state above to add delivery to this amount.</p>}
              </div>
              <div>
                <p className="field-label">Send to</p>
                {addressReady ? (
                  <div className="mt-2 flex items-start gap-3">
                    <code className="break-all text-sm">{address}</code>
                    <button type="button" className="shrink-0 text-xs uppercase tracking-[0.2em] text-champagne-700 underline underline-offset-4"
                      onClick={() => { void navigator.clipboard.writeText(address).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }); }}>
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">This chain is not available right now.</p>
                )}
                {chain && addressReady && <p className="mt-2 break-all text-xs text-muted">USDC token: {chain.contract}</p>}
              </div>
              <div>
                <label htmlFor="hash" className="field-label">Transaction hash</label>
                <input id="hash" className="field" value={hash} onChange={(e) => setHash(e.target.value)} autoComplete="off" spellCheck={false} />
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="h-fit border border-champagne-300/50 bg-ivory-100/60 p-8">
        <h2 className="eyebrow mb-6">Summary</h2>
        <ul className="mb-8 flex flex-col gap-3 text-sm">
          {priced.items.map((i) => (
            <li key={i.product.slug} className="flex justify-between gap-4"><span>{i.product.name} x {i.qty}</span></li>
          ))}
        </ul>
        <OrderTotals priced={priced} />
        {error && <p role="alert" className="mt-6 text-sm text-red-800">{error}</p>}
        <button type="submit" className="btn btn-primary mt-8 w-full" disabled={busy || (method === "usdc" && !addressReady)}>
          {busy ? "Please wait" : method === "naira" ? "Pay in Naira" : "Confirm on WhatsApp"}
        </button>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted">{site.shipping.note}</p>
      </aside>
    </form>
  );
}
