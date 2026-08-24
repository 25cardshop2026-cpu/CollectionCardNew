export type Language = "JP" | "EN";

/**
 * แกนคุณภาพที่ราคาผูกอยู่
 *
 * NM ถึง DMG คือสภาพของการ์ดดิบ ส่วน PSA10 คือใบที่ส่งเกรดแล้วได้ 10 เต็ม
 * สองอย่างนี้เป็นคนละตลาดกัน แต่อยู่แกนเดียวกันเพราะราคาหนึ่งแถวต้องระบุ
 * ได้ค่าเดียวว่าหมายถึงใบสภาพไหน
 */
export type Condition = "PSA10" | "NM" | "LP" | "MP" | "HP" | "DMG";

/** เรียงจากดีสุดไปแย่สุด ลำดับนี้คือลำดับคอลัมน์ในตารางราคา */
export const CONDITIONS: Condition[] = ["PSA10", "NM", "LP", "MP", "HP", "DMG"];

export type VariantType =
  | "normal"
  | "parallel"
  | "alt_art"
  | "manga"
  | "full_art"
  | "promo";

export const VARIANT_LABEL: Record<VariantType, string> = {
  normal: "Normal",
  parallel: "Parallel",
  alt_art: "Alt Art",
  manga: "Manga Rare",
  full_art: "Full Art",
  promo: "Promo",
};

export interface Game {
  slug: string;
  nameTh: string;
  nameEn: string;
  taglineTh: string;
  taglineEn: string;
}

export interface CardSet {
  code: string;
  gameSlug: string;
  nameTh: string;
  nameEn: string;
  language: Language;
  releaseDate: string;
  totalCards: number;
}

export interface Card {
  id: string;
  slug: string;
  setCode: string;
  number: string;
  nameTh: string;
  nameEn: string;
  rarity: string;
  cardType: string;
  color: string;
  /**
   * แบบการพิมพ์ของใบนี้ — การ์ดเลขเดียวกันแต่คนละอาร์ตคือคนละใบ คนละราคา
   * จึงแยกเป็นคนละแถวในระบบ ไม่ได้ยุบรวมกันด้วยเลขการ์ด
   */
  variantType: VariantType;
  /** URL รูปที่แอดมินอัปโหลดเอง ไม่มี = ใช้ผิวฟอยล์แทนรูป */
  imageUrl?: string;
  /**
   * ลิงก์ไปหน้าต้นทางที่ใช้ดูราคาของใบนี้ (ร้าน มาร์เก็ตเพลส หรือหน้าประมูล)
   * มีไว้ให้คนอัปเดตราคากดเปิดไปดูราคาล่าสุดได้ทันทีจากตารางในแดชบอร์ด
   * ไม่ได้ดึงราคาอัตโนมัติ — เป็นแค่ทางลัดไปหาที่มาของตัวเลข
   */
  sourceUrl?: string;
}

export interface Variant {
  id: string;
  cardId: string;
  variantType: VariantType;
  isFoil: boolean;
}

/**
 * ช่องทางที่ราคามาจาก — การ์ดใบเดียวกันคนละช่องทางคนละราคา
 * market = ราคาตลาดไทยที่เราถือเป็นราคาหลัก ใช้กับราคาที่ไม่ได้ระบุช่องทาง
 */
export type PriceSource = "market" | "ebay" | "snkrdunk";

/** ช่องทางที่โชว์แยกให้ดูบนหน้าการ์ด (ไม่รวม market ที่เป็นราคาหลักอยู่แล้ว) */
export const CHANNELS = ["ebay", "snkrdunk"] as const satisfies readonly PriceSource[];

export type Channel = (typeof CHANNELS)[number];

/**
 * ราคาผูกกับ variant + condition + ช่องทาง เสมอ ไม่ใช่ผูกกับ card
 * — ดูเหตุผลใน docs/PLAN.md หัวข้อ 2
 */
export interface PricePoint {
  variantId: string;
  condition: Condition;
  priceThb: number;
  recordedAt: string;
  /** ไม่ระบุ = ราคาตลาดหลัก เพื่อให้ข้อมูลเก่าที่บันทึกไว้ยังอ่านได้เหมือนเดิม */
  source?: PriceSource;
}

export interface PriceCurrent {
  variantId: string;
  condition: Condition;
  priceThb: number;
  change7d: number | null;
  updatedAt: string;
}

/** การ์ด + ข้อมูลประกอบที่หน้า grid และหน้ารายละเอียดต้องใช้ */
export interface CardWithPrice {
  card: Card;
  set: CardSet;
  variants: Variant[];
  /** ราคาต่ำสุดในบรรดา variant ทั้งหมด ที่สภาพ NM — ใช้โชว์บน grid */
  headline: PriceCurrent | null;
}

export interface Mover {
  card: Card;
  set: CardSet;
  variant: Variant;
  price: PriceCurrent;
}
