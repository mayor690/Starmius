import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getReport } from "@/lib/stats";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const range = Number(new URL(req.url).searchParams.get("range")) || 30;
  return NextResponse.json(await getReport(range), { headers: { "Cache-Control": "no-store" } });
}
