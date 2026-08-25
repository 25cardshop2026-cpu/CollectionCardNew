/**
 * ดึงราคาต่ำสุดปัจจุบันจาก SNKRDUNK ผ่าน endpoint สาธารณะของเขา ไม่ต้องล็อกอิน
 *
 * รหัสสินค้าที่แอดมินกรอกไว้เป็นแค่ตัวเลขท้าย URL หน้าสินค้า (เช่น 864495)
 * แต่ตัว API ต้องการรูป "SW---864495" จึงเติมคำนำหน้าให้ตรงนี้ที่เดียว
 * ไม่ให้ผู้ใช้ต้องจำหรือพิมพ์คำนำหน้าเอง
 */

const SNKRDUNK_SUMMARIES_URL = "https://snkrdunk.com/en/v1/products/summaries";
const CODE_PREFIX = "SW---";

/** จำนวนรหัสต่อคำขอหนึ่งครั้ง — กันไม่ให้ query string ยาวเกินไปและลดความเสี่ยงโดนจำกัดอัตรา */
const BATCH_SIZE = 25;

interface ProductSummary {
  code?: string;
  minPrice?: number | null;
}

interface ProductSummariesResponse {
  productSummaries?: ProductSummary[];
}

export interface SnkrdunkFetchResult {
  /** productId (ตัวเลขที่แอดมินกรอก) → ราคาต่ำสุดปัจจุบัน (บาท) */
  prices: Map<string, number>;
  /** productId ที่ยิงไปแล้วไม่ได้ราคากลับมา (ไม่พบสินค้า/หมดสต็อก/คำขอล้มเหลว) */
  missing: string[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** productIds คือตัวเลขล้วน ๆ ตามที่เก็บใน card.snkrdunkCode */
export async function fetchSnkrdunkLowestPrices(productIds: string[]): Promise<SnkrdunkFetchResult> {
  const prices = new Map<string, number>();
  const missing: string[] = [];
  const uniqueIds = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];

  for (const batch of chunk(uniqueIds, BATCH_SIZE)) {
    const params = new URLSearchParams();
    for (const id of batch) params.append("identifiers", `${CODE_PREFIX}${id}`);

    try {
      const res = await fetch(`${SNKRDUNK_SUMMARIES_URL}?${params.toString()}`, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        missing.push(...batch);
        continue;
      }

      const data = (await res.json()) as ProductSummariesResponse;
      const found = new Set<string>();

      for (const item of data.productSummaries ?? []) {
        if (!item.code?.startsWith(CODE_PREFIX)) continue;
        const productId = item.code.slice(CODE_PREFIX.length);
        if (typeof item.minPrice === "number" && item.minPrice > 0) {
          prices.set(productId, item.minPrice);
          found.add(productId);
        }
      }

      for (const id of batch) {
        if (!found.has(id)) missing.push(id);
      }
    } catch {
      missing.push(...batch);
    }
  }

  return { prices, missing };
}
