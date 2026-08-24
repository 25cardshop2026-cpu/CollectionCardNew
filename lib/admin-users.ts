import { isAdminEmail, listAllUsers } from "./users";

/**
 * รายชื่อบัญชีสำหรับหน้าจัดการผู้ใช้ในแดชบอร์ด
 *
 * เรียกจากหน้าที่กันสิทธิ์แล้วเท่านั้น และคืนเฉพาะข้อมูลที่แอดมินต้องใช้
 * ไม่มีแฮชรหัสผ่านติดไปด้วย
 */

export interface AccountRow {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isAdmin: boolean;
}

export async function listAccounts(): Promise<AccountRow[]> {
  const users = await listAllUsers();

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
