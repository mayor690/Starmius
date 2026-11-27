"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { checkoutConfig } from "@/data/checkout";
import { payments, type PaymentMethod, type Token } from "@/data/payments";
import { site } from "@/data/site";
import { formatNGN, formatToken } from "@/lib/format";
import { NIGERIA_STATES, OUTSIDE_NIGERIA } from "@/lib/shipping";
import { priceCart } from "@/lib/pricing";
import { buildOrderMessage, cleanCustomer, whatsappUrl } from "@/lib/order-message";
import { USDC_WA_KEY } from "./whatsapp-notify";
import { track } from "@/lib/track";
import { addressProblem } from "@/lib/usdc";
import { useAuth } from "./auth-provider";
import { useCart } from "./cart-provider";
import { useCatalog } from "./catalog-provider";
import { BankPanel } from "./bank-panel";
import { CityField } from "./city-field";
import { OrderTotals } from "./order-totals";

const REF_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function newOrderRef(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `STM-${Array.from(bytes, (b) => REF_CHARS[b % REF_CHARS.length]).join("")}`;
}

const EVM_HASH = /^0x[a-fA-F0-9]{64}$/;
const SOL_SIG = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

export function CheckoutForm() {
  const router = useRouter();
  const { lines, hydrated, clear } = useCart();
  const { session } = useAuth();

  const { usdc, bank } = useCatalog();
  // Naira, bank transfer when it is set up, plus each crypto token the owner has not switched off.
  const methods = payments.methods.filter((m) => {
    if (!m.enabled) return false;
    if (m.id === "naira") return true;
    if (m.id === "bank") return bank.enabled && Boolean(bank.accountNumber);
    return !usdc.disabledTokens.includes(m.id === "usdc" ? "USDC" : "USDT");
  });

  const [method, setMethod] = useState<PaymentMethod["id"]>(methods[0]?.id ?? "naira");
  const [values, setValues] = useState<Record<string, string>>({});
  const token: Token | null = method === "usdc" ? "USDC" : method === "usdt" ? "USDT" : null;
  const chains = useMemo(
    () => (token ? payments.crypto.chains.filter((c) => c.enabled && c.tokens[token] && !usdc.disabledChains.includes(c.id)) : []),
    [token, usdc.disabledChains],
  );
  const [chainId, setChainId] = useState("");
  const [hash, setHash] = useState("");
  // The order reference goes in the transfer narration, so it is fixed before the customer pays.
  const [bankRef] = useState(newOrderRef);
  const [senderName, setSenderName] = useState("");
  const [transferRef, setTransferRef] = useState("");
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
  // A chain that does not offer the chosen token (for example Arc has no USDT) falls back to the first one that does.
  const chain = useMemo(() => chains.find((c) => c.id === chainId) ?? chains[0], [chains, chainId]);
  const tokenInfo = chain && token ? chain.tokens[token] : undefined;
  const address = chain ? (chain.family === "evm" ? usdc.evmAddress : usdc.solanaAddress) : "";
  const addressReady = address !== "" && !addressProblem(chain?.family ?? "evm", address);

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

  async function confirmBank() {
    if (!priced.shippingKnown) { setError("Please select your state so delivery can be added."); return; }
    if (!whatsappBase) { setError("WhatsApp contact is not configured."); return; }
    setBusy(true);
    // Open the WhatsApp tab now, while the tap still counts, and fill it in once the order is saved.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const res = await fetch("/api/bank/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: bankRef, items: lines, customer: values, senderName, transferRef }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ref?: string; amountNGN?: number; shippingNGN?: number; items?: { name: string; qty: number; lineNGN: number }[] };
      if (!res.ok || !data.ref || !data.items || data.amountNGN === undefined) throw new Error(data.error ?? "We could not record your order. Please try again.");

      const message = buildOrderMessage({
        method: "bank",
        reference: data.ref,
        customer: cleanCustomer(values),
        items: data.items.map((i) => ({ name: i.name, qty: i.qty, total: formatNGN(i.lineNGN) })),
        delivery: formatNGN(data.shippingNGN ?? 0),
        totalPaid: formatNGN(data.amountNGN),
        senderName: senderName.trim(),
        transferRef: transferRef.trim(),
      });
      const url = whatsappUrl(message, whatsappBase);
      if (!url) throw new Error("WhatsApp contact is not configured.");
      try { sessionStorage.setItem(USDC_WA_KEY, url); } catch { /* storage unavailable */ }
      if (tab) tab.location.href = url;
      clear();
      router.push(`/checkout/complete?method=bank&ref=${encodeURIComponent(data.ref)}`);
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "We could not record your order. Please try again.");
      setBusy(false);
    }
  }

  function confirmUsdc() {
    if (!priced.shippingKnown) { setError("Please select your state so delivery can be added."); return; }
    if (!chain || !token || !addressReady) { setError("Crypto payment is not available right now."); return; }
    const valid = chain.family === "evm" ? EVM_HASH.test(hash.trim()) : SOL_SIG.test(hash.trim());
    if (!valid) { setError("Please paste a valid transaction hash for the selected chain."); return; }
    if (!whatsappBase) { setError("WhatsApp contact is not configured."); return; }

    const reference = `STM-${Date.now().toString(36).toUpperCase()}`;
    const message = buildOrderMessage({
      method: "crypto",
      token,
      reference,
      customer: cleanCustomer(values),
      items: priced.items.map((i) => ({ name: i.product.name, qty: i.qty, total: formatToken(i.lineUSDC, token) })),
      delivery: formatToken(priced.shippingUSDC, token),
      totalPaid: formatToken(priced.totalUSDC, token),
      chain: chain.name,
      hash: hash.trim(),
    });
    const url = whatsappUrl(message, whatsappBase);
    if (!url) { setError("WhatsApp contact is not configured."); return; }
    try { sessionStorage.setItem(USDC_WA_KEY, url); } catch { /* storage unavailable */ }
    window.open(url, "_blank", "noopener,noreferrer");
    clear();
    router.push(`/checkout/complete?method=usdc&token=${token}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    track({ t: method === "naira" ? "co" : method === "bank" ? "bank" : "usdc" });
    if (method === "naira") void payNaira();
    else if (method === "bank") void confirmBank();
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

          {method === "bank" && (
            <BankPanel bank={bank} reference={bankRef} totalNGN={priced.totalNGN} shippingKnown={priced.shippingKnown} steps={checkoutConfig.bankSteps}
              senderName={senderName} onSender={setSenderName} transferRef={transferRef} onTransferRef={setTransferRef} />
          )}

          {token && (
            <div className="flex flex-col gap-6 border border-champagne-300/50 bg-ivory-100/60 p-6">
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
                {checkoutConfig.usdcSteps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <div>
                <label htmlFor="chain" className="field-label">Chain</label>
                <select id="chain" className="field" value={chain?.id ?? ""} onChange={(e) => setChainId(e.target.value)}>
                  {chains.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <p className="field-label">Amount</p>
                <p className="mt-1 font-display text-2xl">{formatToken(priced.totalUSDC, token)}</p>
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
                {chain && addressReady && <p className="mt-2 break-all text-xs text-muted">{token} token: {tokenInfo?.contract}</p>}
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
        <button type="submit" className="btn btn-primary mt-8 w-full" disabled={busy || (token !== null && !addressReady)}>
          {busy ? "Please wait" : method === "naira" ? "Pay in Naira" : method === "bank" ? "I have paid, confirm on WhatsApp" : "Confirm on WhatsApp"}
        </button>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted">{site.shipping.note}</p>
      </aside>
    </form>
  );
}
