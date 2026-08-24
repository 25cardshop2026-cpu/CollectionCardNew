import { readJson } from "./store";
import { isAdminEmail, type User } from "./users";

/**
 * รายชื่อบัญชีสำหรับหน้าจัดการผู้ใช้ในแดชบอร์ด
 *
 * แยกจาก lib/users.ts เพราะที่นั่นตั้งใจไม่ให้มีฟังก์ชัน "อ่านผู้ใช้ทั้งหมด"
 * ที่หน้าเว็บสาธารณะเรียกได้ — ไฟล์นี้ถูกเรียกจากหน้าแดชบอร์ดที่กันสิทธิ์แล้ว
 * เท่านั้น และคืนเฉพาะข้อมูลที่แอดมินต้องใช้ ไม่มีแฮชรหัสผ่านติดไปด้วย
 */

export interface AccountRow {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isAdmin: boolean;
}

export async function listAccounts(): Promise<AccountRow[]> {
  const users = await readJson<User[]>("users.json", []);
  if (!Array.isArray(users)) return [];

  return users
    .map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      isAdmin: isAdminEmail(user.email),
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
