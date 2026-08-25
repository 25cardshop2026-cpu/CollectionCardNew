"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkImage, deleteCardImage, saveCardImage } from "./images";
import {
  createCard,
  createSet,
  deleteCard,
  deleteSet,
  loadState,
  setCardImage,
  setFeaturedCards,
  updateCard,
} from "./repo";
import { VARIANT_LABEL, type Language, type VariantType } from "./types";

export interface FormState {
  error?: string;
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function isVariantType(value: string): value is VariantType {
  return value in VARIANT_LABEL;
}

/** ล้างแคชของหน้าที่แสดงข้อมูลชุดนี้ ทั้งฝั่งเว็บสาธารณะและแดชบอร์ด */
function revalidateEverything(): void {
  revalidatePath("/", "layout");
}

export async function createCardAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  await loadState();

  const setCode = text(form, "setCode");
  const rawPrice = text(form, "priceThb").replace(/,/g, "").trim();
  const priceThb = rawPrice ? Number(rawPrice) : null;

  if (priceThb !== null && (!Number.isFinite(priceThb) || priceThb <= 0)) {
    return { error: "ราคาต้องเป็นตัวเลขมากกว่า 0 หรือเว้นว่างไว้" };
  }

  const variantTypes = form
    .getAll("variants")
    .filter((v): v is string => typeof v === "string")
    .filter(isVariantType);

  const result = await createCard({
    setCode,
    number: text(form, "number"),
    nameTh: text(form, "nameTh"),
    nameEn: text(form, "nameEn"),
    rarity: text(form, "rarity"),
    cardType: text(form, "cardType"),
    color: text(form, "color"),
    variantTypes,
    priceThb,
    sourceUrl: text(form, "sourceUrl"),
  });

  if (!result.ok) return { error: result.error };

  revalidateEverything();
  redirect(`/admin/cards?set=${encodeURIComponent(setCode)}&added=${result.value.id}`);
}

export async function updateCardAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  await loadState();

  const id = text(form, "id");

  const result = await updateCard(id, {
    nameTh: text(form, "nameTh"),
    nameEn: text(form, "nameEn"),
    rarity: text(form, "rarity"),
    cardType: text(form, "cardType"),
    color: text(form, "color"),
    sourceUrl: text(form, "sourceUrl"),
    snkrdunkCode: text(form, "snkrdunkCode"),
  });

  if (!result.ok) return { error: result.error };

  revalidateEverything();
  redirect(
    `/admin/cards?set=${encodeURIComponent(result.value.setCode)}&saved=${result.value.id}`,
  );
}

export async function deleteCardAction(form: FormData): Promise<void> {
  await loadState();

  const id = text(form, "id");
  const setCode = text(form, "setCode");

  const result = await deleteCard(id);
  revalidateEverything();

  const status = result.ok ? `deleted=${id}` : `error=${encodeURIComponent(result.error)}`;
  redirect(`/admin/cards?set=${encodeURIComponent(setCode)}&${status}`);
}

export async function createSetAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  await loadState();

  const language = text(form, "language") === "EN" ? "EN" : "JP";
  const totalCards = Number(text(form, "totalCards") || "0");

  if (!Number.isFinite(totalCards) || totalCards < 0) {
    return { error: "จำนวนการ์ดในชุดต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" };
  }

  const releaseDate = text(form, "releaseDate");
  if (!releaseDate) return { error: "ต้องระบุวันวางจำหน่าย" };

  const result = await createSet({
    gameSlug: text(form, "gameSlug"),
    code: text(form, "code"),
    nameTh: text(form, "nameTh"),
    nameEn: text(form, "nameEn"),
    language: language as Language,
    releaseDate,
    totalCards,
  });

  if (!result.ok) return { error: result.error };

  revalidateEverything();
  redirect(`/admin/cards?set=${encodeURIComponent(result.value.code)}`);
}

export async function deleteSetAction(form: FormData): Promise<void> {
  await loadState();

  const code = text(form, "code");

  const result = await deleteSet(code);
  revalidateEverything();

  const status = result.ok
    ? `deleted=${encodeURIComponent(code)}&cards=${result.value.cards}`
    : `error=${encodeURIComponent(result.error)}`;
  redirect(`/admin/sets?${status}`);
}

/**
 * หน้าที่จะกลับไปหลังจัดการรูปเสร็จ
 * รับเฉพาะ path ในแดชบอร์ด กัน redirect หลุดออกไปเว็บอื่นถ้ามีคนยัดค่ามาเอง
 */
function backTo(form: FormData, cardId: string): string {
  const wanted = text(form, "returnTo");
  if (wanted.startsWith("/admin/") && !wanted.startsWith("//")) return wanted;
  return `/admin/cards/${encodeURIComponent(cardId)}`;
}
/**
 * อัปโหลดรูปการ์ด — ไฟล์วิ่งผ่าน server action ตรงเข้า Blob
 * ไม่ต้องมี API upload แยก และไม่ต้องเปิดที่เก็บให้เขียนจากเบราว์เซอร์
 */
export async function uploadCardImageAction(form: FormData): Promise<void> {
  const id = text(form, "id");
  const file = form.get("image");

  if (!(file instanceof File)) {
    redirect(`${backTo(form, id)}?error=${encodeURIComponent("ไม่พบไฟล์รูป")}`);
  }

  const check = checkImage(file);
  if (!check.ok) {
    redirect(`${backTo(form, id)}?error=${encodeURIComponent(check.error ?? "")}`);
  }

  await loadState();
  const url = await saveCardImage(id, file);
  if (!url) {
    redirect(
      `${backTo(form, id)}?error=${encodeURIComponent("อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง")}`,
    );
  }

  const result = await setCardImage(id, url);
  revalidateEverything();

  const status = result.ok ? "uploaded=1" : `error=${encodeURIComponent(result.error)}`;
  redirect(`${backTo(form, id)}?${status}`);
}

export async function removeCardImageAction(form: FormData): Promise<void> {
  const id = text(form, "id");

  await loadState();
  await deleteCardImage(id);
  const result = await setCardImage(id, null);
  revalidateEverything();

  const status = result.ok ? "removed=1" : `error=${encodeURIComponent(result.error)}`;
  redirect(`${backTo(form, id)}?${status}`);
}

/** ปักหมุดการ์ดที่จะโชว์บนหน้าแรก — เว้นว่าง = ให้ระบบเลือกให้เอง */
export async function setFeaturedCardsAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  await loadState();

  const ids = form
    .getAll("cardId")
    .filter((value): value is string => typeof value === "string");

  const result = await setFeaturedCards(ids);
  if (!result.ok) return { error: result.error };

  revalidateEverything();
  redirect("/admin/home?saved=1");
}
