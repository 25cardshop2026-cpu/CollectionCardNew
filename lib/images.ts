import { del, get, put } from "@vercel/blob";
import { IMAGE_BUCKET, db } from "./db";

/**
 * รูปการ์ดที่แอดมินอัปโหลดเอง
 *
 * เก็บใน Supabase Storage (bucket ส่วนตัวชื่อ card-images) ถ้าต่อไว้แล้ว
 * ไม่งั้นถอยไปใช้ Vercel Blob เหมือนเดิม
 *
 * ไม่ว่าเก็บที่ไหน รูปถูกเสิร์ฟผ่าน /api/card-image/[id] ของเราเองเสมอ
 * ไม่ได้ลิงก์ตรงไปที่ที่เก็บ เพราะทั้งสองที่เป็นแบบส่วนตัว เปิดจากภายนอกตรง ๆ
 * ไม่ได้ ทางนี้ยังได้ URL ที่คงที่และตั้งแคชเองได้ และเปลี่ยนที่เก็บได้โดยที่
 * URL ที่บันทึกไว้ในข้อมูลการ์ดไม่ต้องเปลี่ยนตาม
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
  // id ของการ์ดมีเครื่องหมาย : คั่นแบบพิมพ์ (OP13-118:normal) ซึ่งใช้เป็น
  // ชื่อไฟล์ตรง ๆ ไม่ได้ จึงแทนด้วย __ ให้ยังอ่านออกว่าเป็นใบไหน
  return `cards/${cardId.replace(/:/g, "__")}`;
}

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

/** URL ที่เอาไปเก็บในข้อมูลการ์ด — v= กันรูปเก่าค้างในแคชหลังอัปทับ */
function servedUrl(cardId: string, version: string): string {
  return `/api/card-image/${encodeURIComponent(cardId)}?v=${version.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
}

/** อัปโหลดรูปแล้วคืน URL ที่เอาไปเก็บในข้อมูลการ์ดได้เลย */
export async function saveCardImage(cardId: string, file: File): Promise<string | null> {
  const client = db();
  if (client) {
    const { error } = await client.storage
      .from(IMAGE_BUCKET)
      .upload(pathOf(cardId), file, { contentType: file.type, upsert: true });
    if (error) return null;

    // Supabase ไม่ได้คืน etag มาให้ ใช้เวลาที่อัปเป็นตัวกันแคชแทน
    // ซึ่งเปลี่ยนทุกครั้งที่อัปทับเหมือนกัน
    return servedUrl(cardId, Date.now().toString(36));
  }

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
    return servedUrl(cardId, result.etag);
  } catch {
    return null;
  }
}

export async function deleteCardImage(cardId: string): Promise<boolean> {
  const client = db();
  if (client) {
    const { error } = await client.storage.from(IMAGE_BUCKET).remove([pathOf(cardId)]);
    return !error;
  }

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
  const client = db();
  if (client) {
    const { data, error } = await client.storage.from(IMAGE_BUCKET).download(pathOf(cardId));
    if (error || !data) return null;

    return {
      stream: data.stream() as ReadableStream<Uint8Array>,
      contentType: data.type || "image/png",
    };
  }

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
