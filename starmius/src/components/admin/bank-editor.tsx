"use client";

import type { BankSettings } from "@/lib/types";

/** The bank account customers send transfers to. */
export function BankEditor({ value, onChange }: { value: BankSettings; onChange: (v: BankSettings) => void }) {
  const set = (p: Partial<BankSettings>) => onChange({ ...value, ...p });
  const digitsBad = value.accountNumber !== "" && !/^\d{10}$/.test(value.accountNumber.replace(/\s+/g, ""));
  const incomplete = value.enabled && (!value.bankName || !value.accountName || !value.accountNumber);

  return (
    <section>
      <h2 className="font-display text-3xl font-medium">Bank transfer</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        Customers see these details at checkout, transfer the exact amount with their order reference as the narration, then confirm on WhatsApp. When the alert reaches you, mark the order as received in the <strong>Bank transfers</strong> tab.
      </p>
      <label className="mt-5 flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-[#6b4f2a]" checked={value.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        Accept bank transfers
      </label>
      <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="bank-name">Bank name</label>
          <input id="bank-name" className="field" maxLength={80} placeholder="e.g. GTBank" value={value.bankName} onChange={(e) => set({ bankName: e.target.value })} />
        </div>
        <div>
          <label className="field-label" htmlFor="bank-acct-name">Account name</label>
          <input id="bank-acct-name" className="field" maxLength={100} value={value.accountName} onChange={(e) => set({ accountName: e.target.value })} />
        </div>
        <div>
          <label className="field-label" htmlFor="bank-acct-no">Account number</label>
          <input id="bank-acct-no" inputMode="numeric" className="field font-mono" maxLength={14} placeholder="10 digits" value={value.accountNumber} onChange={(e) => set({ accountNumber: e.target.value.replace(/[^\d\s]/g, "") })} aria-invalid={digitsBad} />
          {digitsBad && <p role="alert" className="mt-1 text-xs text-red-800">An account number has exactly 10 digits.</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="bank-note">Note for customers (optional)</label>
          <input id="bank-note" className="field" maxLength={200} value={value.note} onChange={(e) => set({ note: e.target.value })} />
        </div>
      </div>
      {incomplete && <p role="alert" className="mt-4 text-sm text-red-800">Fill in the bank name, account name and account number before switching this on.</p>}
      <p className="mt-4 text-xs text-muted">Check the account number against your bank app, and send yourself a small test transfer first.</p>
    </section>
  );
}
