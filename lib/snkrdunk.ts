/**
 * ดึงราคาต่ำสุดปัจจุบันจาก SNKRDUNK ผ่าน endpoint สาธารณะของเขา ไม่ต้องล็อกอิน
 *
 * เว็บ SNKRDUNK ตัดสินสกุลเงินที่ตอบกลับจาก IP ของผู้ยิงคำขอเท่านั้น — ทดสอบแล้ว
 * ว่าไม่มีพารามิเตอร์ (currency=, country=), header (Accept-Language), หรือ
 * cookie ไหนบังคับให้ตอบเป็นบาทได้เลย และ Vercel ไม่มีเซิร์ฟเวอร์ในไทยให้เลือก
 * (ลองแล้วทั้ง IAD ของสหรัฐฯ และ Singapore ต่างก็ได้ USD/SGD ไม่ใช่ THB)
 * คำขอจากเซิร์ฟเวอร์ของเราเลยได้ราคาเป็นสกุลอื่นเสมอ ไม่ใช่ THB ตรง ๆ
 *
 * ทางแก้: อ่านสกุลเงินที่ตอบมาจริง (currencyId) แล้วแปลงเป็นบาทเองด้วยอัตรา
 * แลกเปลี่ยนตลาดปัจจุบัน — ไม่เป๊ะเท่าราคาที่คนไทยเห็นตรง ๆ บนหน้าเว็บ (ราคา
 * ต่อสกุลเงินของเขาอาจมีส่วนต่างที่ไม่ใช่แค่อัตราแลกเปลี่ยนล้วน ๆ) แต่ใกล้เคียง
 * พอใช้งานได้ และสำคัญที่สุดคือไม่มีทางเพี้ยนเป็น 10-30 เท่าแบบตอนที่เอาตัวเลข
 * สกุลอื่นมาใช้ตรง ๆ โดยไม่แปลงหน่วยเหมือนที่เจอมาก่อน
 */

const SUMMARIES_URL = "https://snkrdunk.com/en/v1/products/summaries";
const CODE_PREFIX = "SW---";
const TRADING_CARD_URL_PATTERN = /trading-cards\/(\d+)/;

/** จำนวนรหัสต่อคำขอหนึ่งครั้ง — กันไม่ให้ query string ยาวเกินไปและลดความเสี่ยงโดนจำกัดอัตรา */
const BATCH_SIZE = 25;

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

/** ใช้เมื่อดึงอัตราแลกเปลี่ยนสดไม่ได้ — ตัวเลขคร่าว ๆ ดีกว่าไม่มีเลย */
const FALLBACK_RATES_TO_THB: Record<string, number> = {
  THB: 1,
  USD: 32.7,
  JPY: 0.22,
  SGD: 24.3,
  EUR: 35.5,
  GBP: 41.5,
  HKD: 4.2,
  MYR: 7.3,
};

let cachedRates: Record<string, number> | null = null;
let cachedRatesAt = 0;
const RATE_CACHE_MS = 60 * 60 * 1000;

/** อัตราแลกเปลี่ยน "1 หน่วยสกุลนั้น = กี่บาท" แคชไว้ 1 ชั่วโมง ไม่ต้องยิงซ้ำทุกใบ */
async function ratesToThb(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cachedRatesAt < RATE_CACHE_MS) return cachedRates;

  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=THB", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("rate fetch failed");

    const data = (await res.json()) as { rates?: Record<string, number> };
    // API คืนมาเป็น "1 บาท = เท่าไหร่สกุลนั้น" ต้องกลับด้านเป็น "1 สกุลนั้น = กี่บาท"
    const rates: Record<string, number> = { THB: 1 };
    for (const [code, perThb] of Object.entries(data.rates ?? {})) {
      if (perThb > 0) rates[code] = 1 / perThb;
    }

    cachedRates = { ...FALLBACK_RATES_TO_THB, ...rates };
    cachedRatesAt = now;
    return cachedRates;
  } catch {
    return FALLBACK_RATES_TO_THB;
  }
}

interface ProductSummary {
  code?: string;
  minPrice?: number | null;
  currencyId?: string;
}

interface ProductSummariesResponse {
  productSummaries?: ProductSummary[];
}

export interface SnkrdunkFetchResult {
  /** productId (ตัวเลขที่แอดมินกรอก) → ราคาต่ำสุดปัจจุบัน แปลงเป็นบาทแล้ว */
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
  if (uniqueIds.length === 0) return { prices, missing };

  const rates = await ratesToThb();

  for (const batch of chunk(uniqueIds, BATCH_SIZE)) {
    const params = new URLSearchParams();
    for (const id of batch) params.append("identifiers", `${CODE_PREFIX}${id}`);

    try {
      const res = await fetch(`${SUMMARIES_URL}?${params.toString()}`, {
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
        const rate = rates[item.currencyId ?? "THB"];

        if (typeof item.minPrice === "number" && item.minPrice > 0 && rate) {
          prices.set(productId, Math.round(item.minPrice * rate));
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
