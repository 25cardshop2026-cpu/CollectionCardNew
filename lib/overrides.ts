import fs from "node:fs";
import path from "node:path";
import { get, put } from "@vercel/blob";
import type { Card, CardSet, PricePoint, Variant } from "./types";

/**
 * ที่เก็บ "ส่วนต่าง" จากข้อมูลตั้งต้น
 *
 * ข้อมูลตัวอย่างใน seed.ts สร้างขึ้นใหม่ได้เสมอแบบ deterministic
 * เราจึงเก็บเฉพาะสิ่งที่แอดมินแก้ — ของที่เพิ่ม แก้ ลบ และราคาที่บันทึก
 * ก้อนข้อมูลเลยเล็กพอที่จะอ่านใหม่ทุกครั้งที่มีคนเปิดหน้า
 *
 * มีที่เก็บสองแบบ เลือกอัตโนมัติจากว่ามี BLOB_READ_WRITE_TOKEN ไหม:
 *
 * 1. Vercel Blob — ใช้บนเซิร์ฟเวอร์จริง เพราะดิสก์ของโฮสต์แบบ serverless
 *    เขียนไม่ได้ และแต่ละ instance ไม่เห็นดิสก์ของกันและกัน
 * 2. ไฟล์ data/overrides.json — ใช้ตอนพัฒนาในเครื่องที่ไม่มี token
 *
 * ทำไมไม่เก็บในหน่วยความจำ:
 * Next.js สร้างโมดูลแยกชุดกันต่อ route และ serverless สร้าง instance ใหม่
 * ได้ตลอด การเขียนลงตัวแปรระดับโมดูลจึงหายทันทีที่ผู้ใช้ย้ายหน้า
 * ตัวแปรในไฟล์นี้เป็นได้แค่แคช ไม่ใช่แหล่งข้อมูลจริง
 */

export interface Overrides {
  sets: CardSet[];
  cards: Card[];
  variants: Variant[];
  cardEdits: Record<string, Partial<Card>>;
  deletedSetCodes: string[];
  /** การ์ดที่ปักหมุดให้โชว์บนหน้าแรก ว่าง = ให้ระบบเลือกให้เอง */
  featuredCardIds: string[];
  deletedCardIds: string[];
  pricePoints: PricePoint[];
  /** เพิ่มขึ้นทุกครั้งที่บันทึก ใช้ให้ repo รู้ว่าต้องสร้างดัชนีใหม่ */
  version: number;
}

export const EMPTY_OVERRIDES: Overrides = {
  sets: [],
  cards: [],
  variants: [],
  cardEdits: {},
  deletedSetCodes: [],
  featuredCardIds: [],
  deletedCardIds: [],
  pricePoints: [],
  version: 0,
};

/**
 * กุญแจบอกรุ่นของข้อมูลที่โหลดมา (etag ของ blob หรือเวลาแก้ไฟล์)
 * repo ใช้เทียบว่าต้องสร้างดัชนีใหม่ไหม — เทียบด้วย version อย่างเดียวไม่พอ
 * เพราะสอง instance อาจถือ version เท่ากันแต่เนื้อหาคนละชุด
 */
export interface LoadedOverrides {
  overrides: Overrides;
  key: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "overrides.json");
const BLOB_PATH = "overrides.json";

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

/** มี Blob ต่ออยู่ไหม — ถ้ามีให้ใช้ Blob เสมอ ทั้งบนเซิร์ฟเวอร์และในเครื่อง */
export function usingBlob(): boolean {
  return blobToken() !== undefined;
}

let fileWritable: boolean | null = null;

/** ตรวจว่าดิสก์เขียนได้ไหม ทำครั้งเดียวแล้วจำไว้ */
function isFileWritable(): boolean {
  if (fileWritable !== null) return fileWritable;

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    fileWritable = true;
  } catch {
    fileWritable = false;
  }

  return fileWritable;
}

/** บันทึกได้ไหม — ต่อ Blob แล้วถือว่าได้เสมอ ไม่งั้นดูที่ดิสก์ */
export function isStorageWritable(): boolean {
  return usingBlob() || isFileWritable();
}

function normalize(parsed: Partial<Overrides>): Overrides {
  return { ...EMPTY_OVERRIDES, ...parsed };
}

async function loadFromBlob(): Promise<LoadedOverrides> {
  try {
    // useCache: false เพราะ CDN อาจคืนของเก่าหลังแอดมินเพิ่งบันทึก
    const result = await get(BLOB_PATH, {
      access: "private",
      useCache: false,
      token: blobToken(),
    });
    if (!result) return { overrides: EMPTY_OVERRIDES, key: "empty" };

    const text = await new Response(result.stream).text();
    return { overrides: normalize(JSON.parse(text)), key: result.blob.etag };
  } catch {
    // อ่านไม่ได้หรือไฟล์เสียหาย — ใช้ข้อมูลตั้งต้นดีกว่าพังทั้งเว็บ
    return { overrides: EMPTY_OVERRIDES, key: "error" };
  }
}

function loadFromFile(): LoadedOverrides {
  try {
    const mtimeMs = fs.statSync(DATA_FILE).mtimeMs;
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as Partial<Overrides>;
    return { overrides: normalize(parsed), key: String(mtimeMs) };
  } catch {
    return { overrides: EMPTY_OVERRIDES, key: "empty" };
  }
}

export async function loadOverrides(): Promise<LoadedOverrides> {
  return usingBlob() ? loadFromBlob() : loadFromFile();
}

export async function saveOverrides(next: Overrides): Promise<LoadedOverrides | null> {
  const body = JSON.stringify(next, null, 2);

  if (usingBlob()) {
    try {
      const result = await put(BLOB_PATH, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        // ไม่ให้ CDN เก็บไว้ เพราะเป็นสถานะปัจจุบันที่ต้องสดเสมอ
        cacheControlMaxAge: 0,
        token: blobToken(),
      });
      return { overrides: next, key: result.etag };
    } catch {
      return null;
    }
  }

  if (!isFileWritable()) return null;

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, body, "utf8");
    return { overrides: next, key: String(fs.statSync(DATA_FILE).mtimeMs) };
  } catch {
    fileWritable = false;
    return null;
  }
}
