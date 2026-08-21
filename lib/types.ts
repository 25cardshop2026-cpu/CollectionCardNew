export type Language = "JP" | "EN";

export type Condition = "NM" | "LP" | "MP" | "HP" | "DMG";

export const CONDITIONS: Condition[] = ["NM", "LP", "MP", "HP", "DMG"];

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
  tagline: string;
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
}

export interface Variant {
  id: string;
  cardId: string;
  variantType: VariantType;
  isFoil: boolean;
}

/**
 * ราคาผูกกับ variant + condition เสมอ ไม่ใช่ผูกกับ card
 * — ดูเหตุผลใน docs/PLAN.md หัวข้อ 2
 */
export interface PricePoint {
  variantId: string;
  condition: Condition;
  priceThb: number;
  recordedAt: string;
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
