"use client";

import { payments, TOKENS, type Token } from "@/data/payments";
import { addressProblem } from "@/lib/usdc";
import type { UsdcSettings } from "@/lib/types";

/** Where customers send USDC and USDT, and which chains and tokens they can pick at checkout. */
export function UsdcEditor({ value, onChange }: { value: UsdcSettings; onChange: (v: UsdcSettings) => void }) {
  const evmBad = addressProblem("evm", value.evmAddress);
  const solBad = addressProblem("solana", value.solanaAddress);
  const chains = payments.crypto.chains.filter((c) => c.enabled);
  const toggleChain = (id: string) =>
    onChange({ ...value, disabledChains: value.disabledChains.includes(id) ? value.disabledChains.filter((x) => x !== id) : [...value.disabledChains, id] });
  const toggleToken = (t: Token) =>
    onChange({ ...value, disabledTokens: value.disabledTokens.includes(t) ? value.disabledTokens.filter((x) => x !== t) : [...value.disabledTokens, t] });

  const field = (id: string, label: string, v: string, set: (s: string) => void, bad: string, placeholder: string, hint: string) => (
    <div className="sm:col-span-2">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="field font-mono text-sm" spellCheck={false} autoComplete="off" placeholder={placeholder} value={v} onChange={(e) => set(e.target.value.trim())} aria-invalid={Boolean(bad)} />
      {bad ? <p role="alert" className="mt-1 text-xs text-red-800">{bad}</p> : <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );

  return (
    <section>
      <h2 className="font-display text-3xl font-medium">Crypto payments (USDC and USDT)</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        Customers who pay in crypto are shown these addresses at checkout. Both tokens are worth one dollar, so item prices are shown in dollars and the customer pays the same amount in USDC or USDT. Copy each address straight from your wallet, never type it. Money sent to a wrong address cannot be recovered, so send a small test amount of each token first.
      </p>

      <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {field("usdc-evm", "EVM wallet address", value.evmAddress, (s) => onChange({ ...value, evmAddress: s }), evmBad, "0x...",
          "One address receives USDC and USDT on every EVM chain below: Arc (USDC only), Base, Ethereum, Polygon, Arbitrum, Optimism and BNB Chain.")}
        {field("usdc-sol", "Solana wallet address", value.solanaAddress, (s) => onChange({ ...value, solanaAddress: s }), solBad, "Solana address",
          "Used only for Solana. Leave it empty to switch Solana off.")}
      </div>

      <fieldset className="mt-8">
        <legend className="field-label">Tokens customers can pay with</legend>
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          {TOKENS.map((t) => (
            <label key={t} className="flex items-center gap-3">
              <input type="checkbox" className="size-4 accent-[#6b4f2a]" checked={!value.disabledTokens.includes(t)} onChange={() => toggleToken(t)} />
              <span className="font-medium">{t}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="field-label">Chains customers can choose</legend>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chains.map((c) => {
            const off = value.disabledChains.includes(c.id);
            const missing = (c.family === "evm" ? value.evmAddress : value.solanaAddress) === "";
            return (
              <li key={c.id} className="border border-champagne-300/50 bg-ivory-50 p-3 text-sm">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="size-4 accent-[#6b4f2a]" checked={!off} onChange={() => toggleChain(c.id)} />
                  <span className="font-medium">{c.name}</span>
                  {!off && missing && <span className="text-xs text-red-800">needs an address</span>}
                </label>
                {TOKENS.map((t) => c.tokens[t] && (
                  <p key={t} className="mt-1 break-all pl-7 font-mono text-[0.65rem] text-muted">{t}: {c.tokens[t]?.contract}</p>
                ))}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted">The token addresses are fixed in the code for safety. A chain with no wallet address above shows as unavailable at checkout. USDT is not offered on Arc.</p>
      </fieldset>
    </section>
  );
}
