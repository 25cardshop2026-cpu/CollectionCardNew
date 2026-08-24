import { hashPassword, verifyPassword } from "./auth";
import { isWritable, readJson, writeJson } from "./store";

/**
 * บัญชีผู้ใช้ของคนที่มาสร้างพอร์ตการ์ดของตัวเอง
 *
 * คนที่ไม่ล็อกอินยังดูราคาและค้นหาได้ทุกอย่างเหมือนเดิม — บัญชีมีไว้เพื่อ
 * ผูกพอร์ตเข้ากับคนคนหนึ่งเท่านั้น ไม่ได้เอาไว้กั้นเนื้อหา
 *
 * เก็บทั้งหมดในไฟล์ JSON ไฟล์เดียว เพราะจำนวนผู้ใช้ยังอยู่ในหลักพัน
 * อ่านทั้งก้อนต่อ request ยังถูกกว่าการดูแลฐานข้อมูลแยกอีกตัว
 * วันที่คนเยอะกว่านี้ค่อยเปลี่ยนไส้ในของไฟล์นี้เป็น query โดยไม่ต้องแก้หน้าเว็บ
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
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function toPublic(user: User): PublicUser {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** พอใช้กันคนพิมพ์ผิด ไม่ได้พยายามตรวจตามมาตรฐาน RFC ซึ่งทำไม่ได้จริงอยู่แล้ว */
function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function loadUsers(): Promise<User[]> {
  const data = await readJson<User[]>(USERS_KEY, []);
  return Array.isArray(data) ? data : [];
}

export async function findUserById(id: string): Promise<User | undefined> {
  return (await loadUsers()).find((user) => user.id === id);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const wanted = normalizeEmail(email);
  return (await loadUsers()).find((user) => user.email === wanted);
}

export const MIN_PASSWORD_LENGTH = 8;

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
  if (!isWritable()) {
    return { ok: false, error: "สมัครสมาชิกไม่ได้ตอนนี้ เพราะที่เก็บข้อมูลเขียนไม่ได้" };
  }

  // อ่านของล่าสุดก่อนเขียนเสมอ ไม่ใช้สำเนาที่ค้างอยู่ เพราะ instance อื่น
  // อาจเพิ่งสมัครสมาชิกคนใหม่ไปแล้ว
  const users = await loadUsers();
  if (users.some((user) => user.email === email)) {
    return { ok: false, error: "อีเมลนี้มีคนใช้แล้ว" };
  }

  const user: User = {
    id: crypto.randomUUID(),
    email,
    displayName,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  if (!(await writeJson(USERS_KEY, [...users, user]))) {
    return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  return { ok: true, value: user };
}

export async function authenticate(email: string, password: string): Promise<Result<User>> {
  const user = await findUserByEmail(email);

  // ข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผ่านผิด ไม่งั้นหน้านี้จะกลายเป็น
  // เครื่องมือให้คนไล่เช็กว่าอีเมลไหนสมัครไว้แล้วบ้าง
  const wrong = { ok: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" } as const;
  if (!user) return wrong;

  return (await verifyPassword(password, user.passwordHash)) ? { ok: true, value: user } : wrong;
}
