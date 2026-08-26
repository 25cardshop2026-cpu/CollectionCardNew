import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { canPersist, loadState, setCardImage, updateCard } from "@/lib/repo";
import { saveCardImageFromUrl } from "@/lib/images";
import { fetchSnkrdunkThumbnail } from "@/lib/snkrdunk";

export const dynamic = "force-dynamic";

/**
 * ผูก (หรือถอด) ลิงก์ต้นทางราคาของการ์ดหนึ่งใบ
 *
 * แยกเป็น API เพราะหน้าอัปเดตราคาเป็นตารางที่บันทึกทีละช่องแบบไม่รีโหลดหน้า
 * เหมือนช่องราคา — ให้คนที่นั่งไล่กรอกราคาวางลิงก์ต้นทางได้ตรงนั้นเลย
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง" }, { status: 400 });
  }

  const { cardId, sourceUrl } = (body ?? {}) as { cardId?: unknown; sourceUrl?: unknown };

  if (typeof cardId !== "string" || !cardId) {
    return NextResponse.json({ error: "ต้องระบุ cardId" }, { status: 400 });
  }
  if (typeof sourceUrl !== "string") {
    return NextResponse.json({ error: "sourceUrl ต้องเป็นข้อความ" }, { status: 400 });
  }
  if (!canPersist()) {
    return NextResponse.json(
      { error: "บันทึกไม่ได้ในสภาพแวดล้อมนี้ เพราะที่เก็บข้อมูลเขียนไม่ได้" },
      { status: 503 },
    );
  }

  await loadState();
  const result = await updateCard(cardId, { sourceUrl });
  if (!result.ok) {
    const notFound = result.error.includes("ไม่พบ");
    return NextResponse.json({ error: result.error }, { status: notFound ? 404 : 400 });
  }

  // เช่นเดียวกับหน้าแดชบอร์ด — ใบที่ยังไม่มีรูปเลยและผูกเลขสินค้าได้จากลิงก์นี้
  // ก็ดึงรูปปกมาเก็บให้เลย เป็นของแถม ล้มเหลวได้โดยไม่ทำให้ผูกลิงก์พัง
  if (!result.value.imageUrl && result.value.snkrdunkCode) {
    const thumbnailUrl = await fetchSnkrdunkThumbnail(result.value.snkrdunkCode);
    if (thumbnailUrl) {
      const savedUrl = await saveCardImageFromUrl(cardId, thumbnailUrl);
      if (savedUrl) await setCardImage(cardId, savedUrl);
    }
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ sourceUrl: result.value.sourceUrl ?? "" });
}
