import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Owner-only authentication.
 * - Password lives in ADMIN_PASSWORD (min 12 chars). Signing uses AUTH_SECRET + the password,
 *   so changing either one signs the owner out everywhere.
 * - Session is a signed, httpOnly, SameSite=Strict cookie that expires after 8 hours.
 * - Failed logins are rate limited per IP and globally (in memory, resets on restart).
 */

const COOKIE = "starmius_admin";
const TTL_SECONDS = 60 * 60 * 8;
const MIN_PASSWORD = 12;

export const adminConfigured = () => Boolean(process.env.AUTH_SECRET) && (process.env.ADMIN_PASSWORD ?? "").length >= MIN_PASSWORD;

const key = () => createHash("sha256").update(`starmius-admin|${process.env.AUTH_SECRET}|${process.env.ADMIN_PASSWORD}`).digest();
const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

export function passwordMatches(input: string): boolean {
  return adminConfigured() && safeEqual(input, process.env.ADMIN_PASSWORD ?? "");
}

function verify(token: string | undefined): boolean {
  if (!token || !adminConfigured()) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
    return typeof exp === "number" && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  return verify((await cookies()).get(COOKIE)?.value);
}

export async function startAdminSession(): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** For API routes: returns an error response, or null when the owner is signed in and the request is same-origin. */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["GET", "HEAD"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let originHost = "";
    try { originHost = origin ? new URL(origin).host : ""; } catch { /* invalid origin */ }
    if (!originHost || originHost !== host) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// Login rate limiting
interface Bucket { count: number; start: number; lockedUntil: number }
const WINDOW = 15 * 60_000;
const IP_MAX = 5;
const GLOBAL_MAX = 30;
const buckets = new Map<string, Bucket>();

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

/** Seconds until the caller may try again, or 0 if allowed. */
export function loginRetryAfter(ip: string): number {
  const now = Date.now();
  const wait = Math.max(buckets.get(ip)?.lockedUntil ?? 0, buckets.get("*")?.lockedUntil ?? 0) - now;
  return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

function bump(id: string, max: number, now: number) {
  let b = buckets.get(id);
  if (!b || now - b.start > WINDOW) b = { count: 0, start: now, lockedUntil: 0 };
  b.count += 1;
  if (b.count >= max) b.lockedUntil = now + WINDOW;
  buckets.set(id, b);
  if (buckets.size > 5000) buckets.clear();
}

export function recordLoginFailure(ip: string) {
  const now = Date.now();
  bump(ip, IP_MAX, now);
  bump("*", GLOBAL_MAX, now);
}

export function recordLoginSuccess(ip: string) {
  buckets.delete(ip);
}
