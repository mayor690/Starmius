import { NextResponse } from "next/server";
import {
  adminConfigured, clientIp, endAdminSession, isAdmin, loginRetryAfter, passwordMatches,
  recordLoginFailure, recordLoginSuccess, requireAdmin, sameOrigin, startAdminSession,
} from "@/lib/admin-auth";

const json = (body: unknown, status = 200, headers?: Record<string, string>) => NextResponse.json(body, { status, headers });

export async function GET() {
  return json({ admin: await isAdmin() });
}

export async function POST(req: Request) {
  if (!adminConfigured()) return json({ error: "Admin is not configured. Set ADMIN_PASSWORD (12+ characters) and AUTH_SECRET." }, 503);

  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);

  const ip = clientIp(req);
  const wait = loginRetryAfter(ip);
  if (wait > 0) return json({ error: "Too many attempts. Please try again later." }, 429, { "Retry-After": String(wait) });

  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";

  if (!passwordMatches(password)) {
    recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: "Incorrect password." }, 401);
  }
  recordLoginSuccess(ip);
  await startAdminSession();
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  await endAdminSession();
  return json({ ok: true });
}
