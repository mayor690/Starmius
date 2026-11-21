import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { saveUpload } from "@/lib/store";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const MAX_BYTES = 5 * 1024 * 1024;

/** Identifies the real image type from its first bytes. Never trusts the filename or declared type. */
function sniff(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "No file received." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Image must be 5 MB or smaller." }, 413);
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return json({ error: "Use a JPG, PNG or WebP image." }, 415);
  return json({ path: await saveUpload(buf, ext) });
}
