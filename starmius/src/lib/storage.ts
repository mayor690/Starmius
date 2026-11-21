import "server-only";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Where the shop keeps its data.
 * - On Cloudflare Workers: a D1 database (binding `DB`) for the catalogue, settings and stats,
 *   and an R2 bucket (binding `UPLOADS`) for uploaded images.
 * - Anywhere else (local dev, a VPS): files in DATA_DIR (default ./storage).
 * Everything above this file uses the same functions in both cases.
 */

// Minimal shapes for the Cloudflare bindings, so no extra type package is needed.
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}
export interface D1Database {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}
export interface R2Bucket {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "storage");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

async function bindings(): Promise<{ DB?: D1Database; UPLOADS?: R2Bucket }> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as { DB?: D1Database; UPLOADS?: R2Bucket };
}

let schemaReady = false;
const SCHEMAS = [
  "CREATE TABLE IF NOT EXISTS docs (name TEXT PRIMARY KEY, value TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS counters (day TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind, key))",
  "CREATE TABLE IF NOT EXISTS visitors (day TEXT NOT NULL, hash TEXT NOT NULL, PRIMARY KEY (day, hash))",
  "CREATE TABLE IF NOT EXISTS orders (ref TEXT PRIMARY KEY, day TEXT NOT NULL, at TEXT NOT NULL, data TEXT NOT NULL)",
];

/** The D1 database on Workers, or null when running with local files. Throws on Workers if the binding is missing. */
export async function getDb(): Promise<D1Database | null> {
  if (!onWorkers) return null;
  const { DB } = await bindings();
  if (!DB) throw new Error("Storage is not set up. Add a D1 database binding named DB (see wrangler.jsonc).");
  if (!schemaReady) {
    for (const sql of SCHEMAS) await DB.prepare(sql).run();
    schemaReady = true;
  }
  return DB;
}

// ---- JSON documents (catalogue, settings) --------------------------------

const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_MS = 3000; // saves a database read on every page render; edits show within seconds

export async function readDoc<T>(name: string, seed: () => T): Promise<T> {
  if (onWorkers) {
    const hit = cache.get(name);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
    try {
      const db = await getDb();
      const row = await db?.prepare("SELECT value FROM docs WHERE name = ?").bind(name).first<{ value: string }>();
      const value = row ? (JSON.parse(row.value) as T) : seed();
      if (!row) await writeDoc(name, value).catch(() => undefined);
      cache.set(name, { at: Date.now(), value });
      return value;
    } catch {
      return seed(); // storage unavailable: keep the shop browsable with the starter data
    }
  }
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      const value = seed();
      await writeFileAtomic(file, JSON.stringify(value, null, 2)).catch(() => undefined);
      return value;
    }
    return seed(); // unreadable file: serve the seed without overwriting what is on disk
  }
}

export async function writeDoc(name: string, value: unknown): Promise<void> {
  if (onWorkers) {
    const db = await getDb();
    await db?.prepare("INSERT INTO docs (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value").bind(name, JSON.stringify(value)).run();
    cache.set(name, { at: Date.now(), value });
    return;
  }
  await writeFileAtomic(path.join(DATA_DIR, `${name}.json`), JSON.stringify(value, null, 2));
}

export async function writeFileAtomic(file: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, text, "utf8");
  await fs.rename(tmp, file);
}

// ---- Uploaded images -------------------------------------------------------

export async function writeUpload(name: string, data: Buffer, contentType: string): Promise<void> {
  if (onWorkers) {
    const { UPLOADS } = await bindings();
    if (!UPLOADS) throw new Error("Image storage is not set up. Add an R2 bucket binding named UPLOADS (see wrangler.jsonc).");
    await UPLOADS.put(`uploads/${name}`, new Uint8Array(data), { httpMetadata: { contentType } });
    return;
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), data);
}

export async function readUpload(name: string): Promise<Uint8Array | null> {
  if (onWorkers) {
    const { UPLOADS } = await bindings();
    const obj = await UPLOADS?.get(`uploads/${name}`);
    return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
  }
  try {
    return new Uint8Array(await fs.readFile(path.join(UPLOAD_DIR, name)));
  } catch {
    return null;
  }
}
