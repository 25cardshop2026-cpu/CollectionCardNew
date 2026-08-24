import fs from "node:fs";
import path from "node:path";
import { get, put } from "@vercel/blob";

/**
 * ที่เก็บ JSON ก้อนเล็กแบบใช้ซ้ำได้ — สำหรับข้อมูลผู้ใช้และพอร์ตการ์ด
 *
 * ใช้กติกาเดียวกับ overrides.ts: มี BLOB_READ_WRITE_TOKEN = เก็บใน Vercel Blob
 * ไม่มีก็เขียนลงไฟล์ในโฟลเดอร์ data/ ตอนพัฒนาในเครื่อง
 *
 * ต่างจาก overrides.ts ตรงที่ไม่มี etag/version ให้ติดตาม เพราะข้อมูลพวกนี้
 * อ่านต่อ request แล้วจบ ไม่ได้เอาไปสร้างดัชนีค้างไว้ในหน่วยความจำ
 * — ห้ามแคชไว้ในตัวแปรระดับโมดูล ด้วยเหตุผลเดียวกับที่เขียนไว้ใน overrides.ts
 */

const DATA_DIR = path.join(process.cwd(), "data");

function token(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

export function usingBlob(): boolean {
  return token() !== undefined;
}

function filePath(key: string): string {
  return path.join(DATA_DIR, ...key.split("/"));
}

/** อ่านก้อน JSON หนึ่งก้อน — ไม่มีหรือพังก็คืนค่าตั้งต้น ไม่โยน error */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  if (usingBlob()) {
    try {
      // useCache: false เพราะข้อมูลผู้ใช้ต้องสดเสมอ ล็อกอินแล้วต้องเห็นทันที
      const result = await get(key, { access: "private", useCache: false, token: token() });
      if (!result) return fallback;

      const text = await new Response(result.stream).text();
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  }

  try {
    return JSON.parse(fs.readFileSync(filePath(key), "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** เขียนทับทั้งก้อน — คืน false เมื่อที่เก็บเขียนไม่ได้ ให้ผู้เรียกบอกผู้ใช้เอง */
export async function writeJson(key: string, value: unknown): Promise<boolean> {
  const body = JSON.stringify(value, null, 2);

  if (usingBlob()) {
    try {
      await put(key, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 0,
        token: token(),
      });
      return true;
    } catch {
      return false;
    }
  }

  try {
    const target = filePath(key);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body, "utf8");
    return true;
  } catch {
    return false;
  }
}

/** ที่เก็บนี้บันทึกได้ไหม — ใช้บอกผู้ใช้ล่วงหน้าว่าสมัครสมาชิกได้หรือยัง */
export function isWritable(): boolean {
  if (usingBlob()) return true;

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
