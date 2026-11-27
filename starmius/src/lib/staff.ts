import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readDoc, writeDoc } from "./storage";

/**
 * Staff accounts the owner creates, so helpers can confirm payments without the owner's password.
 * Passwords are stored only as PBKDF2 hashes. Staff can see and confirm bank transfers and nothing else.
 */

export type StaffRole = "payments";

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  salt: string;
  hash: string;
  createdAt: string;
  disabled: boolean;
}

export type PublicStaff = Omit<StaffMember, "salt" | "hash">;

interface StaffDoc { members: StaffMember[] }

export const MIN_STAFF_PASSWORD = 10;
const NAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{1,29}$/;
const ITERATIONS = 100_000; // the most Cloudflare Workers allows

const load = () => readDoc<StaffDoc>("staff", () => ({ members: [] }));

let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const hex = (b: ArrayBuffer | Uint8Array) => Buffer.from(b instanceof Uint8Array ? b : new Uint8Array(b)).toString("hex");

async function derive(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: Buffer.from(saltHex, "hex"), iterations: ITERATIONS }, key, 256);
  return hex(bits);
}

const strip = ({ salt: _s, hash: _h, ...rest }: StaffMember): PublicStaff => rest;

export async function listStaff(): Promise<PublicStaff[]> {
  return (await load()).members.map(strip);
}

/** A short code that changes whenever the password does, so old sessions stop working after a reset. */
export const versionOf = (m: StaffMember) => m.hash.slice(0, 10);

export async function getStaff(id: string): Promise<StaffMember | null> {
  return (await load()).members.find((m) => m.id === id) ?? null;
}

export type StaffResult<T = PublicStaff> = { ok: true; value: T } | { ok: false; error: string };

function checkPassword(pw: string): string {
  if (pw.length < MIN_STAFF_PASSWORD) return `The password needs at least ${MIN_STAFF_PASSWORD} characters.`;
  if (pw.length > 100) return "The password is too long.";
  return "";
}

export function createStaff(name: string, password: string): Promise<StaffResult> {
  return locked(async () => {
    const n = name.trim();
    if (!NAME.test(n)) return { ok: false, error: "Use 2 to 30 letters, numbers, spaces, dots, dashes or underscores for the name." } as const;
    const bad = checkPassword(password);
    if (bad) return { ok: false, error: bad } as const;
    const doc = structuredClone(await load());
    if (doc.members.length >= 20) return { ok: false, error: "You can have up to 20 staff accounts." } as const;
    if (doc.members.some((m) => m.name.toLowerCase() === n.toLowerCase())) return { ok: false, error: "A staff account already uses that name." } as const;
    const salt = randomBytes(16).toString("hex");
    const member: StaffMember = { id: randomBytes(6).toString("hex"), name: n, role: "payments", salt, hash: await derive(password, salt), createdAt: new Date().toISOString(), disabled: false };
    doc.members.push(member);
    await writeDoc("staff", doc);
    return { ok: true, value: strip(member) } as const;
  });
}

export function updateStaff(id: string, change: { password?: string; disabled?: boolean }): Promise<StaffResult> {
  return locked(async () => {
    const doc = structuredClone(await load());
    const m = doc.members.find((x) => x.id === id);
    if (!m) return { ok: false, error: "Staff account not found." } as const;
    if (change.password !== undefined) {
      const bad = checkPassword(change.password);
      if (bad) return { ok: false, error: bad } as const;
      m.salt = randomBytes(16).toString("hex");
      m.hash = await derive(change.password, m.salt);
    }
    if (change.disabled !== undefined) m.disabled = change.disabled;
    await writeDoc("staff", doc);
    return { ok: true, value: strip(m) } as const;
  });
}

export function deleteStaff(id: string): Promise<StaffResult<null>> {
  return locked(async () => {
    const doc = structuredClone(await load());
    const next = doc.members.filter((m) => m.id !== id);
    if (next.length === doc.members.length) return { ok: false, error: "Staff account not found." } as const;
    await writeDoc("staff", { members: next });
    return { ok: true, value: null } as const;
  });
}

/** Checks a name and password. Does the same work whether or not the name exists, so timing gives nothing away. */
export async function verifyStaff(name: string, password: string): Promise<StaffMember | null> {
  const member = (await load()).members.find((m) => m.name.toLowerCase() === name.trim().toLowerCase());
  const salt = member?.salt ?? "00".repeat(16);
  const got = Buffer.from(await derive(password, salt), "hex");
  const want = Buffer.from(member?.hash ?? "00".repeat(32), "hex");
  const same = got.length === want.length && timingSafeEqual(got, want);
  return member && same && !member.disabled ? member : null;
}
