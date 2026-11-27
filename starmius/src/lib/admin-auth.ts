import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Dashboard sign-in for the owner and for staff the owner creates.
 * - The owner's password lives in ADMIN_PASSWORD (min 12 chars). Signing uses AUTH_SECRET + that password,
 *   so changing either one signs everyone out.
 * - Staff sign in with the name and password the owner gave them. They can only work in Bank transfers.
 * - A session is a signed, httpOnly, SameSite=Strict cookie that expires after 8 hours.
 * - Failed logins are rate limited per IP and globally (in memory, resets on restart).
 */

const COOKIE = "starmius_admin";
const TTL_SECONDS = 60 * 60 * 8;
const MIN_PASSWORD = 12;

export type AdminRole = "owner" | "payments";
export interface AdminSession { role: AdminRole; name: string; staffId?: string }

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

interface Payload { exp: number; role: AdminRole; name: string; sid?: string; v?: string }

/** The signed-in person, or null. A staff session also stops working the moment the account is disabled, deleted or reset. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !adminConfigured()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  let p: Payload;
  try { p = JSON.parse(Buffer.from(payload, "base64url").toString()) as Payload; } catch { return null; }
  if (typeof p.exp !== "number" || p.exp <= Date.now() / 1000) return null;
  if (p.role === "owner") return { role: "owner", name: "Owner" };
  if (p.role === "payments" && p.sid) {
    const { getStaff, versionOf } = await import("./staff");
    const m = await getStaff(p.sid);
    if (!m || m.disabled || versionOf(m) !== p.v) return null;
    return { role: "payments", name: m.name, staffId: m.id };
  }
  return null;
}

/** True for any signed-in owner or staff member. */
export async function isAdmin(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export async function startAdminSession(who: { role: "owner" } | { role: "payments"; name: string; staffId: string; version: string }): Promise<void> {
  const body: Payload = who.role === "owner"
    ? { exp: Math.floor(Date.now() / 1000) + TTL_SECONDS, role: "owner", name: "Owner" }
    : { exp: Math.floor(Date.now() / 1000) + TTL_SECONDS, role: "payments", name: who.name, sid: who.staffId, v: who.version };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
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

/** True when the request's Origin matches one of the hosts this server is reached on. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let originHost = "";
  try { originHost = new URL(origin).host; } catch { return false; }
  const hosts = [req.headers.get("x-forwarded-host"), req.headers.get("host")];
  try { hosts.push(new URL(req.url).host); } catch { /* ignore */ }
  return hosts.some((h) => h && h.split(",")[0]?.trim() === originHost);
}

/**
 * For API routes: returns an error response, or null when the caller is allowed.
 * `who` is "owner" (default) for owner-only routes, or "any" to also let staff in.
 */
export async function requireAdmin(req: Request, who: "owner" | "any" = "owner"): Promise<NextResponse | null> {
  const session = await getAdminSession();
  if (!session || (who === "owner" && session.role !== "owner")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["GET", "HEAD"].includes(req.method) && !sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
