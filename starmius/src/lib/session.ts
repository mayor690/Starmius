import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export interface Session {
  kind: "guest" | "email" | "google";
  name?: string;
  email?: string;
  picture?: string;
  iat: number;
}

export type PublicSession = Omit<Session, "iat">;

const COOKIE = "starmius_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function encode(s: Session): string {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (Date.now() / 1000 - s.iat > MAX_AGE) return null;
    return s;
  } catch {
    return null;
  }
}

export const toPublic = (s: Session): PublicSession => ({
  kind: s.kind,
  name: s.name,
  email: s.email,
  picture: s.picture,
});

export async function getSession(): Promise<Session | null> {
  if (!process.env.AUTH_SECRET) return null;
  const jar = await cookies();
  return decode(jar.get(COOKIE)?.value);
}

export async function setSession(s: Omit<Session, "iat">): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, encode({ ...s, iat: Math.floor(Date.now() / 1000) }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
