"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminApi } from "@/lib/admin-api";
import { CopyButton } from "@/components/copy-button";

interface Member { id: string; name: string; disabled: boolean; createdAt: string }

/** A readable password that is easy to read out over the phone. */
function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => chars[b % chars.length]).join("");
  return `${pick(4)}-${pick(4)}-${pick(4)}`;
}

/** Owner only: staff who can confirm bank transfers without the owner's password. */
export function StaffManager() {
  const [staff, setStaff] = useState<Member[] | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<{ name: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setStaff((await adminApi<{ staff: Member[] }>("/api/admin/staff", "GET")).staff); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load staff."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act<T>(fn: () => Promise<T>) {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    setBusy(false);
  }

  const add = (e: FormEvent) => { e.preventDefault(); void act(async () => {
    const r = await adminApi<{ staff: Member[] }>("/api/admin/staff", "POST", { name, password });
    setStaff(r.staff); setShown({ name: name.trim(), password }); setName(""); setPassword(generatePassword());
  }); };

  const reset = (m: Member) => void act(async () => {
    const pw = generatePassword();
    if (!window.confirm(`Reset the password for ${m.name}? They will be signed out.`)) return;
    const r = await adminApi<{ staff: Member[] }>("/api/admin/staff", "PATCH", { id: m.id, password: pw });
    setStaff(r.staff); setShown({ name: m.name, password: pw });
  });
  const toggle = (m: Member) => void act(async () => { setStaff((await adminApi<{ staff: Member[] }>("/api/admin/staff", "PATCH", { id: m.id, disabled: !m.disabled })).staff); });
  const remove = (m: Member) => void act(async () => {
    if (!window.confirm(`Delete the account for ${m.name}?`)) return;
    setStaff((await adminApi<{ staff: Member[] }>(`/api/admin/staff?id=${encodeURIComponent(m.id)}`, "DELETE")).staff);
  });

  return (
    <section>
      <h2 className="font-display text-3xl font-medium">Payments staff</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
        Give helpers their own sign-in so more people can confirm bank transfers quickly. Staff see only the Bank transfers tab. They can mark an exact-amount transfer as received, but cannot cancel orders, accept a different amount, or change anything else. Every confirmation shows who did it.
      </p>

      {shown && (
        <div role="status" className="mt-5 border border-champagne-500/50 bg-ivory-100 p-4 text-sm">
          <p className="font-medium">Sign-in for {shown.name}. Copy it now: the password is not shown again.</p>
          <p className="mt-2 flex flex-wrap items-center gap-3 font-mono">Name: {shown.name} <CopyButton text={shown.name} /> &nbsp; Password: {shown.password} <CopyButton text={shown.password} /></p>
          <p className="mt-2 text-xs text-muted">They sign in at your-site/admin/login with this name and password.</p>
          <button type="button" className="mt-3 text-xs uppercase tracking-[0.2em] text-muted underline" onClick={() => setShown(null)}>Hide</button>
        </div>
      )}

      <ul className="mt-6 divide-y divide-champagne-300/40 border-y border-champagne-300/40 bg-ivory-50">
        {(staff ?? []).map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <span><span className="font-medium">{m.name}</span> <span className="text-xs text-muted">&middot; payments{m.disabled ? " \u00b7 switched off" : ""}</span></span>
            <span className="flex gap-5 text-xs font-medium uppercase tracking-[0.2em]">
              <button type="button" disabled={busy} className="text-champagne-700" onClick={() => reset(m)}>New password</button>
              <button type="button" disabled={busy} className="text-champagne-700" onClick={() => toggle(m)}>{m.disabled ? "Switch on" : "Switch off"}</button>
              <button type="button" disabled={busy} className="text-red-800" onClick={() => remove(m)}>Delete</button>
            </span>
          </li>
        ))}
        {staff && !staff.length && <li className="px-4 py-5 text-center text-muted">No staff yet.</li>}
        {!staff && !error && <li className="px-4 py-5 text-center text-muted">Loading</li>}
      </ul>

      <form onSubmit={add} className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className="field-label" htmlFor="staff-new-name">Staff name</label>
          <input id="staff-new-name" required minLength={2} maxLength={30} className="field" placeholder="e.g. Ada" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label className="field-label" htmlFor="staff-new-pw">Password (10+ characters)</label>
          <input id="staff-new-pw" required minLength={10} maxLength={100} className="field font-mono" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" spellCheck={false} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>Add staff</button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
    </section>
  );
}
