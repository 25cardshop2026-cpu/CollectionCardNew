import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  canPersist,
  listSnkrdunkSyncTargets,
  loadState,
  markSnkrdunkChecked,
  setChannelPricesBatch,
  type ChannelPricePoint,
} from "@/lib/repo";
import { fetchSnkrdunkPrices } from "@/lib/snkrdunk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** จำกัดจำนวนต่อคำขอ กันฟังก์ชันหมดเวลาเมื่อแคตตาล็อกโตเกิน 60 วิที่ทำไหว */
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 200;

interface SyncSummary {
  checked: number;
  remaining: number;
  updated: number;
  missing: string[];
  errors: string[];
}

async function runSync(limit: number): Promise<SyncSummary> {
  await loadState();
  const allTargets = listSnkrdunkSyncTargets();

  if (allTargets.length === 0) {
    return { checked: 0, remaining: 0, updated: 0, missing: [], errors: [] };
  }

  // เรียงจากเก่าสุด/ไม่เคยซิงก์มาก่อนแล้วอยู่แล้ว (ดู listSnkrdunkSyncTargets)
  // ตัดมาแค่ล็อตเดียวต่อคำขอ ที่เหลือรอคิวรอบถัดไป — ทั้งปุ่มกดเองที่เรียกซ้ำ
  // เป็นล็อป และ cron รายวันที่ค่อย ๆ ไล่ทัน จะคืบหน้าไปเรื่อย ๆ ไม่มีวันตกหล่น
  const targets = allTargets.slice(0, limit);

  const { nm, psa10, missing } = await fetchSnkrdunkPrices(targets.map((t) => t.snkrdunkCode));

  const errors: string[] = [];
  const checkedAt = new Date().toISOString();

  // สร้างรายการราคาทั้งล็อตไว้ก่อน แล้วเขียนทีเดียวคำขอเดียว (ดูเหตุผลเต็มใน
  // markCardsChecked ด้านล่าง — ห้ามวนเขียนทีละใบในลูป)
  const points: ChannelPricePoint[] = [];
  for (const target of targets) {
    const nmPrice = nm.get(target.snkrdunkCode);
    if (nmPrice !== undefined) {
      points.push({ variantId: target.variantId, condition: "NM", priceThb: nmPrice, source: "snkrdunk" });
    }
    const psa10Price = psa10.get(target.snkrdunkCode);
    if (psa10Price !== undefined) {
      points.push({ variantId: target.variantId, condition: "PSA10", priceThb: psa10Price, source: "snkrdunk" });
    }
  }

  const wrote = await setChannelPricesBatch(points);
  if (!wrote) errors.push(`บันทึกราคาทั้งล็อต (${points.length} รายการ) ไม่สำเร็จ`);
  const updated = wrote ? points.length : 0;

  // ปักว่าลองแล้วทั้งล็อตในคำขอเดียว ไม่ว่าจะได้ราคากลับมาหรือไม่ก็ตาม — กันใบที่
  // ไม่มีคนลงขายค้างหัวคิวตลอดไปจนใบอื่นไม่ได้คิวสักที (ดูเหตุผลเต็มใน
  // listSnkrdunkSyncTargets) ทำทีเดียวทั้งล็อตแทนที่จะวนทีละใบ ไม่งั้นแคตตาล็อก
  // ทั้งก้อนโดนโหลดใหม่ต่อใบจนงานล็อตใหญ่ช้าจนหมดเวลาฟังก์ชัน
  await markSnkrdunkChecked(targets.map((t) => t.card.id), checkedAt);

  if (updated > 0) revalidatePath("/", "layout");

  return {
    checked: targets.length,
    remaining: Math.max(0, allTargets.length - targets.length),
    updated,
    missing,
    errors,
  };
}

function parseLimit(url: string): number {
  const raw = Number(new URL(url).searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_LIMIT;
  return Math.min(raw, MAX_LIMIT);
}

/**
 * เรียกโดย Vercel Cron ตามตารางเวลาใน vercel.json — ต้องแนบ CRON_SECRET เสมอ
 * เพราะ endpoint นี้ยิงคำขอออกไปหาเว็บนอกและเขียนราคาใหม่ทุกครั้งที่ถูกเรียก
 * ปล่อยให้เรียกได้ฟรี ๆ จะกลายเป็นช่องให้ใครก็ได้ยิงรัว ๆ จนตารางประวัติราคาบวม
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canPersist()) {
    return NextResponse.json(
      { error: "บันทึกไม่ได้ในสภาพแวดล้อมนี้ เพราะที่เก็บข้อมูลเขียนไม่ได้" },
      { status: 503 },
    );
  }

  return NextResponse.json(await runSync(parseLimit(request.url)));
}

/** ปุ่ม "ซิงก์ตอนนี้" ในแดชบอร์ด — ไม่ต้องมี secret เหมือนหน้าแอดมินส่วนอื่นตอนนี้ */
export async function POST(request: Request) {
  if (!canPersist()) {
    return NextResponse.json(
      { error: "บันทึกไม่ได้ในสภาพแวดล้อมนี้ เพราะที่เก็บข้อมูลเขียนไม่ได้" },
      { status: 503 },
    );
  }

  return NextResponse.json(await runSync(parseLimit(request.url)));
}
