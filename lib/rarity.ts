/**
 * ระดับความหายาก → ภาษาภาพ
 *
 * นักสะสมอ่านความหายากจากผิวการ์ดก่อนอ่านตัวอักษรเสมอ
 * เราจึงแปลง rarity ของแต่ละเกมให้เป็น 4 ระดับที่ใช้ร่วมกันได้
 * แล้วให้แต่ละระดับมีผิวของตัวเอง — ยิ่งหายากยิ่งมีฟอยล์
 */

export type RarityTier = "mythic" | "epic" | "rare" | "common";

const MYTHIC = new Set(["SEC", "SAR", "UR", "SP", "SSR"]);
const EPIC = new Set(["SR", "RR", "RRR", "HR"]);
const RARE = new Set(["R", "L", "AR", "RR?"]);

export function rarityTier(rarity: string): RarityTier {
  const key = rarity.trim().toUpperCase();
  if (MYTHIC.has(key)) return "mythic";
  if (EPIC.has(key)) return "epic";
  if (RARE.has(key)) return "rare";
  return "common";
}

/** คลาสผิวการ์ดของแต่ละระดับ — นิยามจริงอยู่ใน globals.css */
export const TIER_SURFACE: Record<RarityTier, string> = {
  mythic: "surface-mythic",
  epic: "surface-epic",
  rare: "surface-rare",
  common: "surface-common",
};

export const TIER_LABEL: Record<RarityTier, string> = {
  mythic: "หายากที่สุด",
  epic: "หายากมาก",
  rare: "หายาก",
  common: "ทั่วไป",
};
