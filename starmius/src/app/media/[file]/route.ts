import { readUpload } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const NAME = /^[a-f0-9]{24}\.(jpg|png|webp)$/;

/** Serves owner-uploaded product and banner images (local folder, or the R2 bucket on Cloudflare). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = NAME.exec(file);
  if (!m) return new Response("Not found", { status: 404 });
  try {
    const data = await readUpload(file);
    if (!data) return new Response("Not found", { status: 404 });
    return new Response(data as BodyInit, {
      headers: {
        "Content-Type": TYPES[m[1] as string] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
