import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { canPersist, loadState, updateCard } from "@/lib/repo";

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

  revalidatePath("/", "layout");
  return NextResponse.json({ sourceUrl: result.value.sourceUrl ?? "" });
}
