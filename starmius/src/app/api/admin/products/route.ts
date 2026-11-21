import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteProduct, getCategories, saveProduct } from "@/lib/store";
import { SLUG, parseProduct } from "@/lib/validate";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

/** Create or update one product. `originalSlug` is set when editing. */
export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { product?: unknown; originalSlug?: unknown } | null;
  const ids = (await getCategories()).map((c) => c.id);
  const parsed = parseProduct(body?.product, ids);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const original = typeof body?.originalSlug === "string" && SLUG.test(body.originalSlug) ? body.originalSlug : undefined;
  try {
    await saveProduct(parsed.value, original);
    return json({ product: parsed.value });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not save." }, 400);
  }
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!SLUG.test(slug)) return json({ error: "Invalid product." }, 400);
  try {
    await deleteProduct(slug);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not delete." }, 400);
  }
}
