import { NextResponse } from "next/server";
import {
  adminConfigured, clientIp, endAdminSession, getAdminSession, loginRetryAfter, passwordMatches,
  recordLoginFailure, recordLoginSuccess, requireAdmin, sameOrigin, startAdminSession,
} from "@/lib/admin-auth";
import { verifyStaff, versionOf } from "@/lib/staff";

const json = (body: unknown, status = 200, headers?: Record<string, string>) => NextResponse.json(body, { status, headers });

export async function GET() {
  const s = await getAdminSession();
  return json({ admin: s !== null, role: s?.role ?? null, name: s?.name ?? null });
}

/** Owner: password only. Staff: the name and password the owner gave them. */
export async function POST(req: Request) {
  if (!adminConfigured()) return json({ error: "Admin is not configured. Set ADMIN_PASSWORD (12+ characters) and AUTH_SECRET." }, 503);

  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);

  const ip = clientIp(req);
  const wait = loginRetryAfter(ip);
  if (wait > 0) return json({ error: "Too many attempts. Please try again later." }, 429, { "Retry-After": String(wait) });

  const body = (await req.json().catch(() => ({}))) as { name?: unknown; password?: unknown };
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";

  let ok = false;
  if (name) {
    const m = await verifyStaff(name, password);
    if (m) {
      ok = true;
      recordLoginSuccess(ip);
      await startAdminSession({ role: "payments", name: m.name, staffId: m.id, version: versionOf(m) });
    }
  } else if (passwordMatches(password)) {
    ok = true;
    recordLoginSuccess(ip);
    await startAdminSession({ role: "owner" });
  }

  if (!ok) {
    recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: name ? "Incorrect name or password." : "Incorrect password." }, 401);
  }
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin(req, "any");
  if (denied) return denied;
  await endAdminSession();
  return json({ ok: true });
}
