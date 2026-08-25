import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { canPersist, getCardById, loadState, setCardImage } from "@/lib/repo";
import { saveCardImageFromUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

/**
 * ดึงรูปจาก URL ภายนอก (เช่น thumbnail จาก SNKRDUNK) มาเป็นรูปการ์ด
 *
 * เติมให้เฉพาะใบที่ยังไม่มีรูปเท่านั้น — ไม่ทับรูปที่แอดมินอัปโหลดเองไว้แล้ว
 * เพราะรูปที่คนเลือกเองตั้งใจแล้ว ไม่ควรถูกแทนที่ด้วยรูปที่ระบบเดามาให้
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง" }, { status: 400 });
  }

  const { cardId, imageUrl, force } = (body ?? {}) as {
    cardId?: unknown;
    imageUrl?: unknown;
    force?: unknown;
  };

  if (typeof cardId !== "string" || !cardId) {
    return NextResponse.json({ error: "ต้องระบุ cardId" }, { status: 400 });
  }
  if (typeof imageUrl !== "string" || !imageUrl) {
    return NextResponse.json({ error: "ต้องระบุ imageUrl" }, { status: 400 });
  }
  if (!canPersist()) {
    return NextResponse.json(
      { error: "บันทึกไม่ได้ในสภาพแวดล้อมนี้ เพราะที่เก็บข้อมูลเขียนไม่ได้" },
      { status: 503 },
    );
  }

  await loadState();
  const card = getCardById(cardId);
  if (!card) {
    return NextResponse.json({ error: "ไม่พบการ์ดนี้" }, { status: 404 });
  }
  if (card.imageUrl && force !== true) {
    return NextResponse.json({ skipped: true, reason: "มีรูปอยู่แล้ว" });
  }

  const url = await saveCardImageFromUrl(cardId, imageUrl);
  if (!url) {
    return NextResponse.json({ error: "ดึงหรืออัปโหลดรูปไม่สำเร็จ" }, { status: 502 });
  }

  const result = await setCardImage(cardId, url);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ imageUrl: url });
}
