"use server";

import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "./i18n/config";
import { safePath } from "./paths";
import { endSession, startSession } from "./session";
import { authenticate, registerUser } from "./users";

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
