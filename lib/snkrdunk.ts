/**
 * ดึงราคาต่ำสุดปัจจุบันจาก SNKRDUNK ผ่าน endpoint สาธารณะของเขา ไม่ต้องล็อกอิน
 *
 * ใช้ /v1/trading-cards/{id}/min-prices-by-conditions (ตัวเดียวกับที่หน้าสินค้าจริงใช้
 * แสดงราคาใต้ปุ่มเลือกสภาพ) ไม่ใช่ /v1/products/summaries ที่เคยลองก่อนหน้านี้ —
 * ตัวนั้นคืนราคาที่ไม่ตรงกับหน้าเว็บจริง (ค้าง/ผิดไปจากราคาจริงได้) endpoint นี้
 * ตรวจสอบแล้วว่าตัวเลขตรงกับที่หน้าเว็บโชว์เป๊ะ แม้ยิงจากเซิร์ฟเวอร์โดยไม่มี
 * session ของเบราว์เซอร์เลยก็ตาม
 */

const TRADING_CARD_URL_PATTERN = /trading-cards\/(\d+)/;

/**
 * แกะเลขสินค้าออกจากสิ่งที่แอดมินวางมา — จะพิมพ์แค่ตัวเลข หรือวาง URL เต็ม ๆ
 * ของหน้าสินค้า (เช่น https://snkrdunk.com/en/trading-cards/104428) ก็ใช้ได้ทั้งคู่
 * คืน null ถ้าแกะไม่ออก (ไม่ใช่ตัวเลขล้วนและไม่ใช่ลิงก์หน้าสินค้า)
 */
export function extractSnkrdunkCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;
  return trimmed.match(TRADING_CARD_URL_PATTERN)?.[1] ?? null;
}

/**
 * ต้องระบุ currency=THB&country=TH ตรง ๆ เสมอ ห้ามพึ่งการเดาประเทศจาก IP
 * เพราะเซิร์ฟเวอร์ที่ยิงคำขอ (Vercel) ไม่ได้อยู่ในไทย เคยเจอมาแล้วว่าไม่ใส่พารามิเตอร์
 * นี้แล้วได้ราคากลับมาเป็นสกุลอื่นปนกัน (ตัวเลขเพี้ยนไปจากราคาจริงบนเว็บมาก)
 */
function minPricesUrl(productId: string): string {
  const params = new URLSearchParams({ currency: "THB", country: "TH" });
  return `https://snkrdunk.com/en/v1/trading-cards/${encodeURIComponent(productId)}/min-prices-by-conditions?${params.toString()}`;
}

interface ConditionPrice {
  minPrice?: number;
}

interface MinPricesResponse {
  conditionPrices?: ConditionPrice[];
}

export interface SnkrdunkFetchResult {
  /** productId (ตัวเลขที่แอดมินกรอก) → ราคาต่ำสุดปัจจุบันข้ามทุกสภาพ (บาท) — เท่ากับแท็บ "All" บนหน้าเว็บ */
  prices: Map<string, number>;
  /** productId ที่ยิงไปแล้วไม่ได้ราคากลับมา (ไม่พบสินค้า/หมดสต็อก/คำขอล้มเหลว) */
  missing: string[];
}

/**
 * เอ็นด์พอยต์นี้รับได้ทีละสินค้าเท่านั้น ไม่มีแบบยิงหลายรายการพร้อมกันในคำขอเดียว
 * จึงยิงพร้อมกันแบบขนานแทน — จำนวนการ์ดที่ผูกไว้จริงไม่น่าเยอะจนเป็นปัญหา
 */
export async function fetchSnkrdunkLowestPrices(productIds: string[]): Promise<SnkrdunkFetchResult> {
  const prices = new Map<string, number>();
  const missing: string[] = [];
  const uniqueIds = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const res = await fetch(minPricesUrl(id), {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          missing.push(id);
          return;
        }

        const data = (await res.json()) as MinPricesResponse;
        const values = (data.conditionPrices ?? [])
          .map((c) => c.minPrice)
          .filter((p): p is number => typeof p === "number" && p > 0);

        if (values.length === 0) {
          missing.push(id);
          return;
        }
        prices.set(id, Math.min(...values));
      } catch {
        missing.push(id);
      }
    }),
  );

  return { prices, missing };
}
