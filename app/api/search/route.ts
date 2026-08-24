import { NextResponse } from "next/server";
import { loadState, searchCards } from "@/lib/repo";
import { VARIANT_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * ผลค้นหาแบบย่อสำหรับกล่องแนะนำใต้ช่องค้นหาบนแถบหัวเว็บ
 *
 * เปิดให้ทุกคนเรียกได้ ไม่ต้องล็อกอิน เพราะเป็นข้อมูลเดียวกับที่หน้าค้นหา
 * แสดงอยู่แล้ว — ไม่ได้เปิดอะไรที่ปิดอยู่
 *
 * คืนชื่อทั้งไทยและอังกฤษ ให้ฝั่งเบราว์เซอร์เลือกเองตามภาษาที่เปิดอยู่
 * จะได้ไม่ต้องมี endpoint แยกต่อภาษา และแคชได้ก้อนเดียว
 */

const LIMIT = 6;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  // ต่ำกว่า 2 ตัวอักษรคือกติกาเดียวกับหน้าค้นหา ตอบว่างไปเลยไม่ต้องแตะข้อมูล
  if (query.length < 2) return NextResponse.json({ results: [] });

  await loadState();

  const results = searchCards(query, LIMIT).map(({ card, set, headline }) => ({
    slug: card.slug,
    number: card.number,
    nameTh: card.nameTh,
    nameEn: card.nameEn,
    setCode: set.code,
    rarity: card.rarity,
    variantLabel: VARIANT_LABEL[card.variantType],
    priceThb: headline?.priceThb ?? null,
  }));

  return NextResponse.json({ results });
}
