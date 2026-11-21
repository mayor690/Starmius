"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminApi } from "@/lib/admin-api";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/admin/session", "POST", { password });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-8 border border-champagne-300/60 bg-ivory-50 p-10">
      <div className="text-center">
        <p className="gold-text font-display text-3xl font-medium tracking-[0.2em]">STARMIUS</p>
        <p className="eyebrow mt-3">Owner access</p>
      </div>
      {!configured ? (
        <p className="text-sm leading-relaxed text-muted">
          Admin is not set up. Add <code>ADMIN_PASSWORD</code> (12 or more characters) and <code>AUTH_SECRET</code> to <code>.env.local</code>, then restart the server.
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="password" className="field-label">Password</label>
            <input id="password" type="password" autoComplete="current-password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={busy || !password}>{busy ? "Please wait" : "Sign in"}</button>
        </>
      )}
    </form>
  );
}
