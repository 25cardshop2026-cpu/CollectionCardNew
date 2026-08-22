import fs from "node:fs";
import path from "node:path";
import type { Card, CardSet, PricePoint, Variant } from "./types";

/**
 * ที่เก็บ "ส่วนต่าง" จากข้อมูลตั้งต้น
 *
 * ข้อมูลตัวอย่างใน seed.ts สร้างขึ้นใหม่ได้เสมอแบบ deterministic
 * เราจึงเก็บลงไฟล์เฉพาะสิ่งที่แอดมินแก้ — ของที่เพิ่ม แก้ ลบ และราคาที่บันทึก
 * ไฟล์เลยเล็กและอ่านเร็วพอที่จะอ่านใหม่ทุกครั้งที่มีคนเปิดหน้า
 *
 * ทำไมต้องลงไฟล์ ไม่เก็บในหน่วยความจำ:
 * Next.js สร้างโมดูลแยกชุดกันต่อ route การเขียนลงตัวแปรระดับโมดูลจึงหาย
 * ทันทีที่ผู้ใช้ย้ายหน้า ไฟล์เป็นที่เดียวที่ทุก route มองเห็นตรงกัน
 *
 * ข้อจำกัด: บนโฮสต์แบบ serverless (เช่น Vercel) ดิสก์เขียนไม่ได้
 * STORAGE_WRITABLE จะเป็น false และการบันทึกจะล้มเหลวอย่างชัดเจน
 * ต้องต่อฐานข้อมูลจริงก่อนใช้งานจริง
 */

export interface Overrides {
  sets: CardSet[];
  cards: Card[];
  variants: Variant[];
  cardEdits: Record<string, Partial<Card>>;
  deletedSetCodes: string[];
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
  deletedCardIds: [],
  pricePoints: [],
  version: 0,
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "overrides.json");

let cache: Overrides = EMPTY_OVERRIDES;
let cachedMtimeMs = -1;
let writable: boolean | null = null;

/** ตรวจว่าดิสก์เขียนได้ไหม ทำครั้งเดียวแล้วจำไว้ */
export function isStorageWritable(): boolean {
  if (writable !== null) return writable;

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }

  return writable;
}

export function readOverrides(): Overrides {
  let mtimeMs: number;

  try {
    mtimeMs = fs.statSync(DATA_FILE).mtimeMs;
  } catch {
    return cache === EMPTY_OVERRIDES ? cache : (cache = EMPTY_OVERRIDES);
  }

  if (mtimeMs === cachedMtimeMs) return cache;

  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as Partial<Overrides>;
    cache = { ...EMPTY_OVERRIDES, ...parsed };
    cachedMtimeMs = mtimeMs;
  } catch {
    // ไฟล์เสียหาย — ใช้ข้อมูลตั้งต้นแทนดีกว่าพังทั้งเว็บ
    cache = EMPTY_OVERRIDES;
  }

  return cache;
}

export function writeOverrides(next: Overrides): boolean {
  if (!isStorageWritable()) return false;

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
    cache = next;
    cachedMtimeMs = fs.statSync(DATA_FILE).mtimeMs;
    return true;
  } catch {
    writable = false;
    return false;
  }
}
