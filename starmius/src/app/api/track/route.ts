import { clientIp, isAdmin } from "@/lib/admin-auth";
import { recordEvents } from "@/lib/stats";

/** Public, cookie-free event intake for the Stats page. Always answers 204 and never echoes anything. */

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|curl|wget/i;
const hits = new Map<string, { n: number; start: number }>();
const LIMIT = 120;
const WINDOW = 60_000;

function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > WINDOW) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { n: 1, start: now });
    return false;
  }
  h.n += 1;
  return h.n > LIMIT;
}

export async function POST(req: Request) {
  const done = () => new Response(null, { status: 204 });
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { if (origin && new URL(origin).host !== host) return done(); } catch { return done(); }
  if (BOT.test(req.headers.get("user-agent") ?? "") || limited(clientIp(req))) return done();
  if (await isAdmin()) return done(); // the owner's own visits are not counted

  const text = await req.text().catch(() => "");
  if (!text || text.length > 4096) return done();
  try {
    await recordEvents(JSON.parse(text) as { vid?: unknown; events?: unknown });
  } catch { /* ignore malformed input */ }
  return done();
}
