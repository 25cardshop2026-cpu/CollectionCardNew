"use server";

import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "./i18n/config";
import { mailConfigured, sendMail } from "./mail";
import {
  clearPendingReset,
  createResetToken,
  recordPendingReset,
  userForResetToken,
} from "./password-reset";
import { safePath } from "./paths";
import { endSession, startSession } from "./session";
import { authenticate, findUserByEmail, registerUser, setPassword } from "./users";

export interface AuthState {
  error?: string;
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function localeOf(form: FormData): Locale {
  const value = text(form, "locale");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** หน้าที่จะพากลับไปหลังล็อกอินเสร็จ ไม่ระบุ = ไปที่พอร์ตของตัวเอง */
function destination(form: FormData): string {
  return safePath(text(form, "redirectTo"), localePath(localeOf(form), "/portfolio"));
}

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const result = await authenticate(text(form, "email"), text(form, "password"));
  if (!result.ok) return { error: result.error };

  await startSession(result.value.id);
  redirect(destination(form));
}

export async function registerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const result = await registerUser({
    email: text(form, "email"),
    displayName: text(form, "displayName"),
    password: text(form, "password"),
  });
  if (!result.ok) return { error: result.error };

  // สมัครเสร็จถือว่าล็อกอินเลย ไม่ต้องให้กรอกรหัสผ่านซ้ำอีกรอบ
  await startSession(result.value.id);
  redirect(destination(form));
}

export async function logoutAction(form: FormData): Promise<void> {
  await endSession();
  redirect(localePath(localeOf(form), "/"));
}

/**
 * ขอลิงก์ตั้งรหัสผ่านใหม่
 *
 * ตอบข้อความเดียวกันเสมอไม่ว่าอีเมลนั้นจะมีบัญชีอยู่หรือไม่ ไม่งั้นหน้านี้จะ
 * กลายเป็นเครื่องมือให้คนไล่เช็กว่าอีเมลไหนสมัครไว้แล้วบ้าง
 */
export async function requestResetAction(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const locale = localeOf(form);
  const email = text(form, "email").trim();
  const user = await findUserByEmail(email);

  if (user) {
    const token = await createResetToken(user);
    const path = `${localePath(locale, "/reset")}?token=${encodeURIComponent(token)}`;

    const sent = await sendMail({
      to: user.email,
      subject: "ตั้งรหัสผ่านใหม่ · Collection Card",
      text: [
        `สวัสดี ${user.displayName}`,
        "",
        "มีคนขอตั้งรหัสผ่านใหม่ให้บัญชีนี้ ถ้าใช่คุณ เปิดลิงก์ข้างล่างภายใน 1 ชั่วโมง",
        "",
        `${process.env.SITE_URL ?? ""}${path}`,
        "",
        "ถ้าไม่ได้เป็นคนขอ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ",
      ].join("\n"),
    });

    if (sent) {
      // ส่งถึงมือเจ้าตัวแล้ว ไม่ต้องเก็บลิงก์ไว้ให้ใครเห็นอีก
      await clearPendingReset(user.email);
    } else {
      // ยังไม่ได้ต่อบริการส่งอีเมล เก็บไว้ให้แอดมินส่งต่อเองในหน้าจัดการผู้ใช้
      await recordPendingReset({
        email: user.email,
        displayName: user.displayName,
        path,
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    }
  }

  redirect(`${localePath(locale, "/forgot")}?sent=1&mail=${mailConfigured() ? "1" : "0"}`);
}

export async function resetPasswordAction(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const user = await userForResetToken(text(form, "token"));
  if (!user) {
    return { error: "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว ขอลิงก์ใหม่อีกครั้ง" };
  }

  const result = await setPassword(user.id, text(form, "password"));
  if (!result.ok) return { error: result.error };

  // ตั้งรหัสใหม่เสร็จถือว่าล็อกอินเลย และเก็บลิงก์ที่ค้างอยู่ทิ้งให้เรียบร้อย
  await clearPendingReset(user.email);
  await startSession(user.id);
  redirect(destination(form));
}
