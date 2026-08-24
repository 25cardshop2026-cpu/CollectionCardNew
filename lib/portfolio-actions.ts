"use server";

import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "./i18n/config";
import { safePath } from "./paths";
import { addHolding, removeHolding, updateHolding } from "./portfolio";
import { getCardById, loadState } from "./repo";
import { currentUser } from "./session";
import { CONDITIONS, type Condition } from "./types";

export interface PortfolioState {
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

function conditionOf(form: FormData): Condition {
  const value = text(form, "condition");
  return (CONDITIONS as string[]).includes(value) ? (value as Condition) : "NM";
}

/** ตัวเลขที่เว้นว่างได้ — "" คือไม่กรอก ไม่ใช่ศูนย์ */
function optionalNumber(raw: string): number | null {
  const clean = raw.replace(/,/g, "").trim();
  return clean ? Number(clean) : null;
}

function backTo(form: FormData): string {
  return safePath(text(form, "redirectTo"), localePath(localeOf(form), "/portfolio"));
}

/** ต่อสถานะท้าย URL โดยไม่ทับ query ที่มีอยู่แล้ว (เช่น ?set=OP-01) */
function withStatus(path: string, status: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${status}`;
}

export async function addHoldingAction(
  _prev: PortfolioState,
  form: FormData,
): Promise<PortfolioState> {
  const user = await currentUser();
  if (!user) return { error: "ต้องเข้าสู่ระบบก่อนถึงจะเก็บการ์ดเข้าพอร์ตได้" };

  // ตรวจว่าการ์ดมีอยู่จริงก่อนบันทึก ไม่งั้นพอร์ตจะเก็บ id ที่ชี้ไปที่ว่าง
  await loadState();
  const cardId = text(form, "cardId");
  if (!getCardById(cardId)) return { error: "ไม่พบการ์ดใบนี้ในระบบ" };

  const quantity = Number(text(form, "quantity") || "1");
  const costThb = optionalNumber(text(form, "costThb"));

  const result = await addHolding(user.id, {
    cardId,
    condition: conditionOf(form),
    quantity,
    costThb,
    note: text(form, "note"),
  });
  if (!result.ok) return { error: result.error };

  redirect(withStatus(backTo(form), "added=1"));
}

export async function updateHoldingAction(form: FormData): Promise<void> {
  const user = await currentUser();
  const path = backTo(form);
  if (!user) redirect(path);

  const result = await updateHolding(user.id, text(form, "holdingId"), {
    quantity: Number(text(form, "quantity") || "1"),
    costThb: optionalNumber(text(form, "costThb")),
  });

  redirect(
    withStatus(path, result.ok ? "updated=1" : `error=${encodeURIComponent(result.error)}`),
  );
}

export async function removeHoldingAction(form: FormData): Promise<void> {
  const user = await currentUser();
  const path = backTo(form);
  if (!user) redirect(path);

  const result = await removeHolding(user.id, text(form, "holdingId"));

  redirect(
    withStatus(path, result.ok ? "removed=1" : `error=${encodeURIComponent(result.error)}`),
  );
}
