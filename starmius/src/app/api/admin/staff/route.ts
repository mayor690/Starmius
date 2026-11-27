import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createStaff, deleteStaff, listStaff, updateStaff } from "@/lib/staff";

/** Owner only. Staff accounts can confirm bank transfers and nothing else. */
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return json({ staff: await listStaff() });
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as { name?: unknown; password?: unknown } | null;
  const r = await createStaff(typeof b?.name === "string" ? b.name : "", typeof b?.password === "string" ? b.password : "");
  return r.ok ? json({ staff: await listStaff() }) : json({ error: r.error }, 400);
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as { id?: unknown; password?: unknown; disabled?: unknown } | null;
  if (typeof b?.id !== "string") return json({ error: "Missing account." }, 400);
  const r = await updateStaff(b.id, {
    ...(typeof b.password === "string" ? { password: b.password } : {}),
    ...(typeof b.disabled === "boolean" ? { disabled: b.disabled } : {}),
  });
  return r.ok ? json({ staff: await listStaff() }) : json({ error: r.error }, 400);
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const r = await deleteStaff(id);
  return r.ok ? json({ staff: await listStaff() }) : json({ error: r.error }, 400);
}
