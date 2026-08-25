import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { canPersist, listSnkrdunkSyncTargets, loadState, setPrice } from "@/lib/repo";
import { fetchSnkrdunkLowestPrices } from "@/lib/snkrdunk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SyncSummary {
  checked: number;
  updated: number;
  missing: string[];
  errors: string[];
}

async function runSync(): Promise<SyncSummary> {
  await loadState();
  const targets = listSnkrdunkSyncTargets();

  if (targets.length === 0) {
    return { checked: 0, updated: 0, missing: [], errors: [] };
  }

  const { prices, missing } = await fetchSnkrdunkLowestPrices(
    targets.map((t) => t.snkrdunkCode),
  );

  let updated = 0;
  const errors: string[] = [];

  for (const target of targets) {
    const priceThb = prices.get(target.snkrdunkCode);
    if (priceThb === undefined) continue;

    const result = await setPrice(target.variantId, "NM", priceThb, "snkrdunk");
    if (result.ok) updated++;
    else errors.push(`${target.card.number} (${target.snkrdunkCode}): ${result.error}`);
  }

  if (updated > 0) revalidatePath("/", "layout");

  return { checked: targets.length, updated, missing, errors };
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

  return NextResponse.json(await runSync());
}

/** ปุ่ม "ซิงก์ตอนนี้" ในแดชบอร์ด — ไม่ต้องมี secret เหมือนหน้าแอดมินส่วนอื่นตอนนี้ */
export async function POST() {
  if (!canPersist()) {
    return NextResponse.json(
      { error: "บันทึกไม่ได้ในสภาพแวดล้อมนี้ เพราะที่เก็บข้อมูลเขียนไม่ได้" },
      { status: 503 },
    );
  }

  return NextResponse.json(await runSync());
}
