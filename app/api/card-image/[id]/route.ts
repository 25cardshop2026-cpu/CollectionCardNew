import { NextResponse } from "next/server";
import { readCardImage } from "@/lib/images";

/**
 * เสิร์ฟรูปการ์ดจากที่เก็บส่วนตัว
 *
 * URL มี ?v= ที่เปลี่ยนทุกครั้งที่อัปรูปใหม่ จึงตั้งแคชแบบถาวรได้เลย
 * รูปเดิมถูกดึงผ่าน CDN ครั้งเดียว ที่เหลือไม่ต้องวิ่งมาถึงเซิร์ฟเวอร์อีก
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await readCardImage(decodeURIComponent(id));

  if (!image) {
    return NextResponse.json({ error: "ไม่พบรูปของการ์ดนี้" }, { status: 404 });
  }

  return new Response(image.stream, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
