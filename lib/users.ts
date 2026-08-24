import { hashPassword, verifyPassword } from "./auth";
import { db, usingSupabase } from "./db";
import { isWritable, readJson, writeJson } from "./store";

/**
 * บัญชีผู้ใช้ของคนที่มาสร้างพอร์ตการ์ดของตัวเอง
 *
 * คนที่ไม่ล็อกอินยังดูราคาและค้นหาได้ทุกอย่างเหมือนเดิม — บัญชีมีไว้เพื่อ
 * ผูกพอร์ตเข้ากับคนคนหนึ่งเท่านั้น ไม่ได้เอาไว้กั้นเนื้อหา
 *
 * ต่อ Supabase แล้วจะเก็บในตาราง users และค้นทีละแถวด้วย query
 * ยังไม่ต่อก็ถอยไปใช้ไฟล์ JSON ก้อนเดียวเหมือนเดิม (อ่านทั้งก้อนต่อ request)
 * ทั้งสองทางให้ผลหน้าตาเดียวกัน โค้ดที่เรียกจึงไม่ต้องรู้ว่าข้อมูลอยู่ที่ไหน
 */

const USERS_KEY = "users.json";

export interface User {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

/** ข้อมูลผู้ใช้เท่าที่หน้าเว็บควรเห็น — ไม่มีแฮชรหัสผ่านติดไปด้วย */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  /** เข้าแดชบอร์ดและแก้ข้อมูลจริงได้ไหม */
  isAdmin: boolean;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * ใครเป็นแอดมิน — ตัดสินจาก ADMIN_EMAILS ในตัวแปรสภาพแวดล้อม ไม่ใช่ธงในฐานข้อมูล
 *
 * เหตุผล: สิทธิ์แอดมินเป็นของที่ยกให้ตัวเองไม่ได้ ถ้าเก็บเป็นธงในไฟล์ผู้ใช้
 * ใครที่เขียนที่เก็บข้อมูลได้ก็ตั้งตัวเองเป็นแอดมินได้ และยังต้องมีทางแต่งตั้ง
 * คนแรกซึ่งมักกลายเป็นช่องโหว่ ("คนที่สมัครคนแรกได้เป็นแอดมิน")
 * เก็บไว้ที่ตัวแปรสภาพแวดล้อมแปลว่าต้องเข้าถึงบัญชี Vercel ได้เท่านั้นถึงจะเปลี่ยน
 *
 * ไม่ตั้งค่าไว้ = ไม่มีใครเป็นแอดมิน แดชบอร์ดถูกล็อกทั้งหมด
 * ปลอดภัยกว่าการเปิดทิ้งไว้เมื่อลืมตั้งค่า
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

/** ตั้ง ADMIN_EMAILS ไว้หรือยัง — ใช้บอกสาเหตุที่ถูกกันตอนยังไม่ได้ตั้ง */
export function adminConfigured(): boolean {
  return adminEmails().length > 0;
}

export function toPublic(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: isAdminEmail(user.email),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** พอใช้กันคนพิมพ์ผิด ไม่ได้พยายามตรวจตามมาตรฐาน RFC ซึ่งทำไม่ได้จริงอยู่แล้ว */
function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * แถวในตาราง users ของ Supabase — ชื่อคอลัมน์เป็น snake_case ตามธรรมเนียม SQL
 * ส่วนในโค้ดใช้ camelCase จึงต้องมีตัวแปลงคั่นกลาง
 */
interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: string;
}

function fromRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

/** ใช้เฉพาะกับหลังบ้านแบบไฟล์ — ฝั่ง Supabase ค้นทีละแถวด้วย query แทน */
async function loadUsers(): Promise<User[]> {
  const data = await readJson<User[]>(USERS_KEY, []);
  return Array.isArray(data) ? data : [];
}

export async function findUserById(id: string): Promise<User | undefined> {
  const client = db();
  if (client) {
    const { data } = await client.from("users").select("*").eq("id", id).maybeSingle();
    return data ? fromRow(data as UserRow) : undefined;
  }
  return (await loadUsers()).find((user) => user.id === id);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const wanted = normalizeEmail(email);

  const client = db();
  if (client) {
    const { data } = await client.from("users").select("*").eq("email", wanted).maybeSingle();
    return data ? fromRow(data as UserRow) : undefined;
  }
  return (await loadUsers()).find((user) => user.email === wanted);
}

/** รายชื่อบัญชีทั้งหมด — เรียกจากหน้าแดชบอร์ดที่กันสิทธิ์แล้วเท่านั้น */
export async function listAllUsers(): Promise<User[]> {
  const client = db();
  if (client) {
    const { data } = await client.from("users").select("*").order("created_at");
    return ((data ?? []) as UserRow[]).map(fromRow);
  }
  return loadUsers();
}

export const MIN_PASSWORD_LENGTH = 8;

/** ต่อ Supabase แล้วถือว่าเขียนได้เสมอ ไม่งั้นดูที่ดิสก์/Blob แบบเดิม */
function storageWritable(): boolean {
  return usingSupabase() || isWritable();
}

export async function registerUser(input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<Result<User>> {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();

  if (!looksLikeEmail(email)) return { ok: false, error: "อีเมลไม่ถูกต้อง" };
  if (!displayName) return { ok: false, error: "ต้องระบุชื่อที่ใช้แสดง" };
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร` };
  }
  if (!storageWritable()) {
    return { ok: false, error: "สมัครสมาชิกไม่ได้ตอนนี้ เพราะที่เก็บข้อมูลเขียนไม่ได้" };
  }

  const user: User = {
    id: crypto.randomUUID(),
    email,
    displayName,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  const client = db();
  if (client) {
    // ปล่อยให้ unique constraint ของคอลัมน์ email เป็นคนตัดสินว่าซ้ำไหม
    // การเช็คก่อนแล้วค่อยเขียนมีช่องให้สองคนสมัครอีเมลเดียวกันพร้อมกันได้
    const { error } = await client.from("users").insert({
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      password_hash: user.passwordHash,
      created_at: user.createdAt,
    });

    if (error) {
      return error.code === "23505"
        ? { ok: false, error: "อีเมลนี้มีคนใช้แล้ว" }
        : { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
    }
    return { ok: true, value: user };
  }

  // อ่านของล่าสุดก่อนเขียนเสมอ ไม่ใช้สำเนาที่ค้างอยู่ เพราะ instance อื่น
  // อาจเพิ่งสมัครสมาชิกคนใหม่ไปแล้ว
  const users = await loadUsers();
  if (users.some((existing) => existing.email === email)) {
    return { ok: false, error: "อีเมลนี้มีคนใช้แล้ว" };
  }

  if (!(await writeJson(USERS_KEY, [...users, user]))) {
    return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  return { ok: true, value: user };
}

/**
 * ตั้งรหัสผ่านใหม่ให้บัญชีหนึ่ง
 *
 * ไม่ตรวจรหัสเดิม เพราะทางเข้าเดียวที่เรียกตัวนี้คือลิงก์ตั้งรหัสใหม่ที่เซ็นไว้
 * ซึ่งพิสูจน์ตัวตนมาแล้วในตัวมันเอง (ดู lib/password-reset.ts)
 */
export async function setPassword(userId: string, password: string): Promise<Result<User>> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร` };
  }
  if (!storageWritable()) {
    return { ok: false, error: "บันทึกไม่ได้ตอนนี้ เพราะที่เก็บข้อมูลเขียนไม่ได้" };
  }

  const passwordHash = await hashPassword(password);

  const client = db();
  if (client) {
    const { data, error } = await client
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error) return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
    if (!data) return { ok: false, error: "ไม่พบบัญชีนี้" };
    return { ok: true, value: fromRow(data as UserRow) };
  }

  const users = await loadUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) return { ok: false, error: "ไม่พบบัญชีนี้" };

  const updated: User = { ...users[index], passwordHash };
  const next = [...users];
  next[index] = updated;

  if (!(await writeJson(USERS_KEY, next))) {
    return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  return { ok: true, value: updated };
}

export async function authenticate(email: string, password: string): Promise<Result<User>> {
  const user = await findUserByEmail(email);

  // ข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผ่านผิด ไม่งั้นหน้านี้จะกลายเป็น
  // เครื่องมือให้คนไล่เช็กว่าอีเมลไหนสมัครไว้แล้วบ้าง
  const wrong = { ok: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" } as const;
  if (!user) return wrong;

  return (await verifyPassword(password, user.passwordHash)) ? { ok: true, value: user } : wrong;
}
