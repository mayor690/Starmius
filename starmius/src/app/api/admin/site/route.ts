import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { saveSettings } from "@/lib/store";
import { parseSettings } from "@/lib/validate";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

/** Socials, email, address and hours. The phone number is fixed in code and cannot be changed here. */
export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const parsed = parseSettings(await req.json().catch(() => null));
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  await saveSettings(parsed.value);
  return json({ settings: parsed.value });
}
