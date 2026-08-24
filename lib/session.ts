import { cookies } from "next/headers";
import { cache } from "react";
import { COOKIE_OPTIONS, SESSION_COOKIE, createSession, readSession } from "./auth";
import { findUserById, toPublic, type PublicUser } from "./users";

/**
 * ผู้ใช้ที่ล็อกอินอยู่ของ request ปัจจุบัน
 *
 * ทุกหน้าที่เรียกใช้ต้องเป็น dynamic อยู่แล้ว เพราะอ่านคุกกี้
 * cache() ทำให้เรียกกี่จุดใน request เดียวก็อ่านที่เก็บผู้ใช้แค่ครั้งเดียว
 */
export const currentUser = cache(async (): Promise<PublicUser | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = await readSession(cookie);
  if (!userId) return null;

  const user = await findUserById(userId);
  return user ? toPublic(user) : null;
});

export async function startSession(userId: string): Promise<void> {
  const session = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, session.value, {
    ...COOKIE_OPTIONS,
    maxAge: session.maxAge,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
