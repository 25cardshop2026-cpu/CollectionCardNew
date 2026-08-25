import { NextResponse } from "next/server";
import { listAdminPriceRows, loadState } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * ราคาปัจจุบันของทั้งชุด ใช้ให้หน้าจอพนักงานคนอื่นดึงมาเช็คเป็นระยะ
 * (โพลลิ่งทุกสองสามวินาที) จะได้เห็นราคาที่เพื่อนร่วมงานเครื่องอื่นเพิ่งกรอก
 * โดยไม่ต้องกดรีเฟรชเอง — ไม่ใช้ WebSocket เพราะที่เก็บข้อมูลตอนนี้ไม่รองรับ
 */
export async function GET(request: Request) {
  const setCode = new URL(request.url).searchParams.get("set");
  if (!setCode) {
    return NextResponse.json({ error: "ต้องระบุ set" }, { status: 400 });
  }

  await loadState();
  const rows = listAdminPriceRows(setCode).map((row) => ({
    cardId: row.card.id,
    prices: row.prices,
    staleDays: row.staleDays,
  }));

  return NextResponse.json({ rows });
}
