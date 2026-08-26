/**
 * ดึงราคาต่ำสุดปัจจุบันจาก SNKRDUNK ผ่าน endpoint สาธารณะของเขา ไม่ต้องล็อกอิน
 *
 * ใช้ /v1/trading-cards/{id}/min-prices-by-conditions (ตัวเดียวกับที่หน้าสินค้าจริงใช้
 * แสดงราคาใต้ปุ่มเลือกสภาพ) เพราะมันแยกราคาต่อสภาพให้ครบ (รวมถึง "PSA 10")
 * ต่างจาก /v1/products/summaries ที่ให้แค่ราคาต่ำสุดรวม และเคยเจอว่าตัวเลขค้าง
 * ไม่ตรงกับ listing ที่ขายอยู่จริงบนหน้าเว็บ
 *
 * เอ็นด์พอยต์นี้ตัดสินสกุลเงินจาก IP ผู้ยิงคำขอเท่านั้น ไม่มีพารามิเตอร์/header/
 * cookie ไหนบังคับเป็นบาทได้เลย (ทดสอบแล้วทั้ง currency=, country=, Accept-Language,
 * cookie, และลองเปลี่ยน Vercel ไปรันที่ Singapore ก็ยังได้ SGD ไม่ใช่ THB) เซิร์ฟเวอร์
 * เราไม่มี IP ไทยให้เลือก คำตอบเลยได้เป็นสกุลอื่นเสมอ — อ่านสกุลที่ตอบมาจริงจาก
 * ข้อความราคา (minPriceFormat) แล้วแปลงเป็นบาทเองด้วยอัตราตลาดปัจจุบัน
 *
 * หมายเหตุความแม่นยำ: ตัวเลขที่ได้เป็นค่าประมาณจากอัตราแลกเปลี่ยน ไม่ใช่ราคาบาท
 * ที่คนไทยเห็นตรง ๆ บนหน้าเว็บเป๊ะ เพราะ SNKRDUNK ตั้งราคาต่อสกุลเงินไม่เท่ากัน
 * เป๊ะตามอัตราแลกเปลี่ยนล้วน ๆ — ใกล้เคียงพอใช้เทียบเฉย ๆ ไม่ใช่ราคาที่เชื่อถือ
 * ได้ 100% แก้ให้แม่นกว่านี้ไม่ได้จากเซิร์ฟเวอร์นอกประเทศไทย
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

function minPricesUrl(productId: string): string {
  return `https://snkrdunk.com/en/v1/trading-cards/${encodeURIComponent(productId)}/min-prices-by-conditions`;
}

const OG_IMAGE_PATTERN = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/;

/**
 * ดึงรูปปกจากหน้าสินค้า SNKRDUNK ตรง ๆ ด้วยเลขสินค้า — ใช้ตอนแอดมินวางลิงก์
 * ต้นทางเองโดยไม่ได้ผ่านช่องค้นหา (ซึ่งได้ thumbnail มาจากผลค้นหาอยู่แล้ว)
 * คืน null ถ้าเปิดหน้าไม่ได้หรือหาแท็ก og:image ไม่เจอ
 */
export async function fetchSnkrdunkThumbnail(productId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://snkrdunk.com/en/trading-cards/${encodeURIComponent(productId)}`, {
      headers: { accept: "text/html" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const html = await res.text();
    return html.match(OG_IMAGE_PATTERN)?.[1] ?? null;
  } catch {
    return null;
  }
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

/** minPriceFormat ไม่มีรหัสสกุลเงินแยก มีแต่สัญลักษณ์ปนกับตัวเลข ต้องเทียบเอา */
function currencyFromFormat(format: string | undefined): string | null {
  if (!format) return null;
  const patterns: [string, string][] = [
    ["US $", "USD"],
    ["SG $", "SGD"],
    ["HK$", "HKD"],
    ["RM", "MYR"],
    ["฿", "THB"],
    ["¥", "JPY"],
    ["€", "EUR"],
    ["£", "GBP"],
    ["$", "USD"],
  ];
  for (const [prefix, code] of patterns) {
    if (format.includes(prefix)) return code;
  }
  return null;
}

interface ConditionPriceEntry {
  conditionName?: string;
  minPrice?: number;
  minPriceFormat?: string;
}

interface MinPricesResponse {
  conditionPrices?: ConditionPriceEntry[];
}

export interface SnkrdunkFetchResult {
  /** productId → ราคาต่ำสุดข้ามทุกสภาพ (ปกติคือใบดิบ) แปลงเป็นบาทแล้ว */
  nm: Map<string, number>;
  /** productId → ราคาต่ำสุดเฉพาะเกรด PSA 10 แปลงเป็นบาทแล้ว — ไม่มีใน map ถ้าไม่มีใบ PSA10 ขายอยู่ */
  psa10: Map<string, number>;
  /** productId ที่ยิงไปแล้วไม่ได้ราคา NM กลับมาเลย (ไม่พบสินค้า/หมดสต็อก/คำขอล้มเหลว) */
  missing: string[];
}

async function fetchOne(
  productId: string,
  rates: Record<string, number>,
): Promise<{ nm: number | null; psa10: number | null } | null> {
  try {
    const res = await fetch(minPricesUrl(productId), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as MinPricesResponse;
    const entries = data.conditionPrices ?? [];
    if (entries.length === 0) return null;

    const toThb = (entry: ConditionPriceEntry): number | null => {
      if (typeof entry.minPrice !== "number" || entry.minPrice <= 0) return null;
      const code = currencyFromFormat(entry.minPriceFormat);
      const rate = code ? rates[code] : undefined;
      return rate ? Math.round(entry.minPrice * rate) : null;
    };

    const allValues = entries.map(toThb).filter((v): v is number => v !== null);
    const nm = allValues.length > 0 ? Math.min(...allValues) : null;

    const psa10Entry = entries.find((e) => e.conditionName === "PSA 10");
    const psa10 = psa10Entry ? toThb(psa10Entry) : null;

    return { nm, psa10 };
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** ยิงพร้อมกันเกิน ~10 คำขอทีเดียวแล้ว SNKRDUNK เริ่มบล็อก (เจอมาแล้วจริง — ทั้งล็อต
 * ตอบว่าไม่มีราคากลับมาเลยสักใบ) จึงยิงเป็นคลื่นเล็ก ๆ แทนการยิงพร้อมกันทั้งหมด */
const CONCURRENCY = 8;
const WAVE_DELAY_MS = 150;

/**
 * เอ็นด์พอยต์นี้รับได้ทีละสินค้าเท่านั้น ไม่มีแบบยิงหลายรายการพร้อมกันในคำขอเดียว
 * จึงยิงพร้อมกันแบบขนานแทน แต่จำกัดจำนวนพร้อมกันไว้ไม่ให้โดนบล็อก
 */
export async function fetchSnkrdunkPrices(productIds: string[]): Promise<SnkrdunkFetchResult> {
  const nm = new Map<string, number>();
  const psa10 = new Map<string, number>();
  const missing: string[] = [];
  const uniqueIds = [...new Set(productIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return { nm, psa10, missing };

  const rates = await ratesToThb();

  for (const wave of chunk(uniqueIds, CONCURRENCY)) {
    await Promise.all(
      wave.map(async (id) => {
        const result = await fetchOne(id, rates);
        if (!result || result.nm === null) {
          missing.push(id);
          return;
        }
        nm.set(id, result.nm);
        if (result.psa10 !== null) psa10.set(id, result.psa10);
      }),
    );
    await sleep(WAVE_DELAY_MS);
  }

  return { nm, psa10, missing };
}
