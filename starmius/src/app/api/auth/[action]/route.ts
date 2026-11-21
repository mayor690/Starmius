import { NextResponse } from "next/server";
import { clearSession, getSession, setSession, toPublic } from "@/lib/session";

type Ctx = { params: Promise<{ action: string }> };

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(_req: Request, { params }: Ctx) {
  const { action } = await params;
  if (action !== "session") return json({ error: "Not found" }, 404);
  const s = await getSession();
  return json({ session: s ? toPublic(s) : null });
}

export async function POST(req: Request, { params }: Ctx) {
  const { action } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    switch (action) {
      case "guest": {
        await setSession({ kind: "guest" });
        return json({ session: { kind: "guest" } });
      }

      case "email": {
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : undefined;
        if (!EMAIL.test(email)) return json({ error: "Please enter a valid email." }, 400);
        await setSession({ kind: "email", email, name: name || undefined });
        return json({ session: { kind: "email", email, name } });
      }

      case "google": {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) return json({ error: "Google sign in is not configured." }, 503);
        const credential = typeof body.credential === "string" ? body.credential : "";
        if (!credential) return json({ error: "Missing credential." }, 400);

        const res = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return json({ error: "Google sign in failed." }, 401);
        const info = (await res.json()) as {
          aud?: string;
          email?: string;
          email_verified?: string;
          name?: string;
          picture?: string;
        };
        if (info.aud !== clientId || info.email_verified !== "true" || !info.email) {
          return json({ error: "Google sign in failed." }, 401);
        }
        await setSession({ kind: "google", email: info.email, name: info.name, picture: info.picture });
        return json({ session: { kind: "google", email: info.email, name: info.name, picture: info.picture } });
      }

      case "logout": {
        await clearSession();
        return json({ session: null });
      }

      default:
        return json({ error: "Not found" }, 404);
    }
  } catch (e) {
    const message = e instanceof Error && e.message.includes("AUTH_SECRET") ? "Sign in is not configured yet." : "Something went wrong.";
    return json({ error: message }, 500);
  }
}
