"use client";

import { formatNGN } from "@/lib/format";
import type { BankSettings } from "@/lib/types";
import { CopyButton } from "./copy-button";

/** Bank details, exact amount and the narration reference for a bank transfer order. */
export function BankPanel({ bank, reference, totalNGN, shippingKnown, steps, senderName, onSender, transferRef, onTransferRef }: {
  bank: BankSettings; reference: string; totalNGN: number; shippingKnown: boolean; steps: string[];
  senderName: string; onSender: (v: string) => void; transferRef: string; onTransferRef: (v: string) => void;
}) {
  const row = (label: string, value: string, copy?: string, mono = false) => (
    <div className="flex items-start justify-between gap-4 border-b border-champagne-300/40 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="field-label">{label}</p>
        <p className={`mt-1 break-words ${mono ? "font-mono text-lg tracking-wider" : "text-base"}`}>{value}</p>
      </div>
      {copy && <CopyButton text={copy} />}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 border border-champagne-300/50 bg-ivory-100/60 p-6">
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>

      <div className="bg-ivory-50 px-5">
        {row("Bank", bank.bankName)}
        {row("Account name", bank.accountName)}
        {row("Account number", bank.accountNumber, bank.accountNumber, true)}
        {row("Amount to transfer", shippingKnown ? formatNGN(totalNGN) : "Select your state above to see the total", shippingKnown ? String(totalNGN) : undefined)}
        {row("Narration / reference", reference, reference, true)}
      </div>
      {bank.note && <p className="text-xs leading-relaxed text-muted">{bank.note}</p>}

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div>
          <label htmlFor="sender" className="field-label">Name on the account you paid from (optional)</label>
          <input id="sender" className="field" maxLength={100} value={senderName} onChange={(e) => onSender(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="transferref" className="field-label">Transfer reference or session ID (optional)</label>
          <input id="transferref" className="field" maxLength={80} value={transferRef} onChange={(e) => onTransferRef(e.target.value)} autoComplete="off" spellCheck={false} />
        </div>
      </div>
    </div>
  );
}
