"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { site } from "@/data/site";
import { useAuth } from "./auth-provider";
import { GoogleButton } from "./google-button";

export function AuthPanel({ next }: { next: string }) {
  const router = useRouter();
  const { session, loading, signIn, signOut } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = useCallback(async (action: "guest" | "email" | "google", body?: Record<string, string>) => {
    setBusy(true);
    setError("");
    const res = await signIn(action, body);
    setBusy(false);
    if (res.ok) router.push(next);
    else setError(res.error ?? "Something went wrong.");
  }, [signIn, router, next]);

  const onGoogle = useCallback((credential: string) => { void finish("google", { credential }); }, [finish]);

  if (loading) return <p className="text-center text-muted">Loading</p>;

  if (session) {
    const label = session.kind === "guest" ? "Guest" : session.name || session.email;
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="font-display text-3xl font-medium">{label}</p>
        {session.email && <p className="text-sm text-muted">{session.email}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          <Link href="/shop" className="btn btn-primary">{site.cart.continue}</Link>
          <button type="button" className="btn btn-outline" onClick={() => void signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  const onEmail = (e: FormEvent) => { e.preventDefault(); void finish("email", { email, name }); };

  return (
    <div className="flex flex-col gap-10">
      <GoogleButton onCredential={onGoogle} />
      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-champagne-300/60" /><span className="eyebrow !text-[0.6rem]">or</span><span className="h-px flex-1 bg-champagne-300/60" />
      </div>
      <form onSubmit={onEmail} className="flex flex-col gap-6">
        <p className="eyebrow text-center">{site.auth.emailTitle}</p>
        <div>
          <label htmlFor="auth-name" className="field-label">Name (optional)</label>
          <input id="auth-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="auth-email" className="field-label">Email</label>
          <input id="auth-email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>Continue</button>
      </form>
      {error && <p role="alert" className="text-center text-sm text-red-800">{error}</p>}
      <button type="button" className="text-center text-xs uppercase tracking-[0.3em] text-champagne-700 underline underline-offset-8" disabled={busy} onClick={() => void finish("guest")}>
        {site.auth.guestLabel}
      </button>
    </div>
  );
}
