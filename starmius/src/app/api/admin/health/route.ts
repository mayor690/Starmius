import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { storageHealth } from "@/lib/storage";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json(await storageHealth(), { headers: { "Cache-Control": "no-store" } });
}
