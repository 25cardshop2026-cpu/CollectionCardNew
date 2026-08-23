import { del, get, put } from "@vercel/blob";

/**
 * รูปการ์ดที่แอดมินอัปโหลดเอง
 *
 * เก็บไว้ในที่เก็บเดียวกับข้อมูลราคา (Vercel Blob แบบส่วนตัว) แล้วเสิร์ฟผ่าน
 * /api/card-image/[id] ของเราเอง ไม่ได้ลิงก์ตรงไปที่ Blob เพราะที่เก็บเป็นแบบ
 * ส่วนตัว เปิดจากภายนอกตรง ๆ ไม่ได้ ทางนี้ยังได้ URL ที่คงที่และตั้งแคชได้เอง
 *
 * ชื่อไฟล์ผูกกับเลขการ์ด อัปทับได้เรื่อย ๆ ส่วนการกันแคชค้างใช้ ?v= ต่อท้าย URL
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/avif"];

export interface ImageCheck {
  ok: boolean;
  error?: string;
}

export function checkImage(file: File): ImageCheck {
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "รับเฉพาะไฟล์ PNG, JPEG, WebP หรือ AVIF" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `ไฟล์ใหญ่เกิน ${MAX_BYTES / 1024 / 1024} MB` };
  }
  if (file.size === 0) return { ok: false, error: "ไฟล์ว่าง" };
  return { ok: true };
}

function pathOf(cardId: string): string {
  return `cards/${cardId}`;
}

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

/** อัปโหลดรูปแล้วคืน URL ที่เอาไปเก็บในข้อมูลการ์ดได้เลย */
export async function saveCardImage(cardId: string, file: File): Promise<string | null> {
  if (!token()) return null;

  try {
    const result = await put(pathOf(cardId), file, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.type,
      token: token(),
    });

    // etag เปลี่ยนทุกครั้งที่อัปทับ จึงใช้เป็นตัวกันรูปเก่าค้างในแคชได้
    const version = result.etag.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    return `/api/card-image/${encodeURIComponent(cardId)}?v=${version}`;
  } catch {
    return null;
  }
}

export async function deleteCardImage(cardId: string): Promise<boolean> {
  if (!token()) return false;

  try {
    await del(pathOf(cardId), { token: token() });
    return true;
  } catch {
    return false;
  }
}

export interface StoredImage {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
}

export async function readCardImage(cardId: string): Promise<StoredImage | null> {
  if (!token()) return null;

  try {
    const result = await get(pathOf(cardId), {
      access: "private",
      // ไม่ใช้แคชของ Blob เพราะรูปที่ลบไปแล้วยังถูกเสิร์ฟต่ออีกพักใหญ่
      // ฝั่งเราตั้ง Cache-Control เองอยู่แล้ว จึงไม่ได้ยิงถึงต้นทางบ่อย
      useCache: false,
      token: token(),
    });
    if (!result || result.statusCode !== 200) return null;

    return {
      stream: result.stream,
      contentType: result.headers.get("content-type") ?? "image/png",
    };
  } catch {
    return null;
  }
}
