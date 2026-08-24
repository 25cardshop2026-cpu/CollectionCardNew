import { equals, hmac } from "./auth";
import { db } from "./db";
import { readJson, writeJson } from "./store";
import { findUserById, type User } from "./users";

/**
 * ลิงก์ตั้งรหัสผ่านใหม่
 *
 * โทเคนไม่ได้เก็บไว้ที่ไหน — เป็นข้อความที่เซ็น HMAC ไว้ว่า "ผู้ใช้คนนี้
 * ใช้ได้ถึงเวลานี้" จึงปลอมไม่ได้ถ้าไม่รู้ความลับ และไม่ต้องมีตารางโทเคน
 * ให้ต้องคอยล้างของหมดอายุ
 *
 * ที่สำคัญคือเอาแฮชรหัสผ่านปัจจุบันไปเซ็นด้วย ผลคือพอตั้งรหัสใหม่สำเร็จ
 * แฮชเปลี่ยน ลายเซ็นเดิมจึงใช้ไม่ได้ทันที — ลิงก์เก่าใช้ซ้ำไม่ได้โดยอัตโนมัติ
 * ไม่ต้องจดว่าโทเคนไหนถูกใช้ไปแล้ว
 */

const TTL_MS = 60 * 60 * 1000;

function payloadOf(user: User, expiresAt: number | string): string {
  return `reset:${user.id}:${expiresAt}:${user.passwordHash}`;
}

export async function createResetToken(user: User): Promise<string> {
  const expiresAt = Date.now() + TTL_MS;
  return `${user.id}.${expiresAt}.${await hmac(payloadOf(user, expiresAt))}`;
}

/** คืนเจ้าของโทเคนถ้าลิงก์ยังใช้ได้ ไม่งั้นคืน null */
export async function userForResetToken(token: string): Promise<User | null> {
  const [userId, expiresAt, signature] = token.split(".");
  if (!userId || !expiresAt || !signature) return null;
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) < Date.now()) return null;

  const user = await findUserById(userId);
  if (!user) return null;

  return equals(signature, await hmac(payloadOf(user, expiresAt))) ? user : null;
}

// ---------- คำขอที่ยังส่งไม่ถึงมือเจ้าตัว ----------

/**
 * ที่พักคำขอตั้งรหัสใหม่ สำหรับตอนที่ยังไม่ได้ต่อบริการส่งอีเมล
 *
 * ถ้าส่งอีเมลได้ ลิงก์จะไปถึงเจ้าตัวโดยตรงและไม่ถูกเก็บไว้ที่นี่เลย
 * ถ้าส่งไม่ได้ แอดมินจะเห็นลิงก์ในหน้าจัดการผู้ใช้แล้วส่งต่อเองได้
 * — ดีกว่าปุ่ม "ลืมรหัสผ่าน" ที่กดแล้วไม่เกิดอะไรขึ้นจริง
 */
const PENDING_KEY = "password-resets.json";
const KEEP = 20;

export interface PendingReset {
  email: string;
  displayName: string;
  /** path ของลิงก์ ไม่รวมโดเมน เพราะโดเมนต่างกันได้ระหว่าง dev กับเว็บจริง */
  path: string;
  requestedAt: string;
  expiresAt: string;
}

interface ResetRow {
  email: string;
  display_name: string;
  path: string;
  requested_at: string;
  expires_at: string;
}

export async function listPendingResets(): Promise<PendingReset[]> {
  const client = db();

  if (client) {
    // หมดอายุแล้วไม่ต้องโชว์ ลิงก์ใช้ไม่ได้อยู่ดี — กรองที่ฐานข้อมูลไปเลย
    const { data } = await client
      .from("password_resets")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("requested_at", { ascending: false })
      .limit(KEEP);

    return ((data ?? []) as ResetRow[]).map((row) => ({
      email: row.email,
      displayName: row.display_name,
      path: row.path,
      requestedAt: row.requested_at,
      expiresAt: row.expires_at,
    }));
  }

  const all = await readJson<PendingReset[]>(PENDING_KEY, []);
  if (!Array.isArray(all)) return [];

  const now = Date.now();
  return all
    .filter((entry) => new Date(entry.expiresAt).getTime() > now)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export async function recordPendingReset(entry: PendingReset): Promise<void> {
  const client = db();

  if (client) {
    // อีเมลเป็น primary key — คนเดิมกดขอซ้ำจึงทับของเดิมให้เอง
    // ไม่งั้นแอดมินจะเห็นหลายลิงก์แล้วไม่รู้ว่าอันไหนใช้ได้
    await client.from("password_resets").upsert({
      email: entry.email,
      display_name: entry.displayName,
      path: entry.path,
      requested_at: entry.requestedAt,
      expires_at: entry.expiresAt,
    });
    return;
  }

  const live = await listPendingResets();
  const others = live.filter((item) => item.email !== entry.email);
  await writeJson(PENDING_KEY, [entry, ...others].slice(0, KEEP));
}

export async function clearPendingReset(email: string): Promise<void> {
  const client = db();

  if (client) {
    await client.from("password_resets").delete().eq("email", email);
    return;
  }

  const live = await listPendingResets();
  await writeJson(
    PENDING_KEY,
    live.filter((item) => item.email !== email),
  );
}
