import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { saveCategories } from "@/lib/store";
import { parseCategories } from "@/lib/validate";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { categories?: unknown } | null;
  const parsed = parseCategories(body?.categories);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  try {
    await saveCategories(parsed.value);
    return json({ categories: parsed.value });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not save." }, 400);
  }
}
