import {
  CARDS,
  CONDITION_MULTIPLIER,
  GAMES,
  HISTORY_DAYS,
  SETS,
  VARIANTS,
  buildHistory,
} from "./seed";
import type {
  Card,
  CardSet,
  CardWithPrice,
  Condition,
  Game,
  Mover,
  PricePoint,
  PriceCurrent,
  Variant,
} from "./types";

/**
 * ชั้นเข้าถึงข้อมูลทั้งหมดของแอปอยู่ในไฟล์นี้ไฟล์เดียว
 *
 * ตอนนี้ทำงานบนข้อมูลตัวอย่างในหน่วยความจำ (โหมดสาธิต)
 * เมื่อจะต่อ Postgres จริง ให้แทนที่เนื้อในของฟังก์ชันเหล่านี้ด้วย query
 * โดยไม่ต้องแก้หน้าเว็บสักหน้า — สัญญาของฟังก์ชันคือขอบเขตที่ตั้งใจให้แลกเปลี่ยนได้
 */

export const IS_DEMO_MODE = !process.env.DATABASE_URL;

const historyStore: PricePoint[] = buildHistory();

const cardById = new Map(CARDS.map((c) => [c.id, c]));
const cardBySlug = new Map(CARDS.map((c) => [c.slug, c]));
const setByCode = new Map(SETS.map((s) => [s.code, s]));
const variantById = new Map(VARIANTS.map((v) => [v.id, v]));

const variantsByCard = new Map<string, Variant[]>();
for (const variant of VARIANTS) {
  const list = variantsByCard.get(variant.cardId) ?? [];
  list.push(variant);
  variantsByCard.set(variant.cardId, list);
}

/** ราคา NM ล่าสุดของแต่ละ variant พร้อมเวลาที่บันทึก */
const latestNm = new Map<string, PricePoint>();
/** ราคา NM เมื่อ 7 วันก่อน ใช้คำนวณ change7d */
const weekAgoNm = new Map<string, number>();

function reindexPrices(): void {
  latestNm.clear();
  weekAgoNm.clear();

  const byVariant = new Map<string, PricePoint[]>();
  for (const point of historyStore) {
    const list = byVariant.get(point.variantId) ?? [];
    list.push(point);
    byVariant.set(point.variantId, list);
  }

  for (const [variantId, points] of byVariant) {
    points.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    latestNm.set(variantId, points[points.length - 1]);
    const weekIndex = Math.max(0, points.length - 8);
    weekAgoNm.set(variantId, points[weekIndex].priceThb);
  }
}

reindexPrices();

function currentPrice(variantId: string, condition: Condition): PriceCurrent | null {
  const latest = latestNm.get(variantId);
  if (!latest) return null;

  const nm = latest.priceThb;
  const before = weekAgoNm.get(variantId) ?? nm;
  const change7d = before > 0 ? ((nm - before) / before) * 100 : null;

  return {
    variantId,
    condition,
    priceThb: Math.round(nm * CONDITION_MULTIPLIER[condition]),
    change7d: change7d === null ? null : Math.round(change7d * 10) / 10,
    updatedAt: latest.recordedAt,
  };
}

// ---------- แคตตาล็อก ----------

export function listGames(): Game[] {
  return GAMES;
}

export function getGame(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export function listSets(gameSlug: string): CardSet[] {
  return SETS.filter((s) => s.gameSlug === gameSlug).sort((a, b) =>
    b.releaseDate.localeCompare(a.releaseDate),
  );
}

export function getSet(code: string): CardSet | undefined {
  return setByCode.get(code);
}

export function getSetBySlug(gameSlug: string, setSlug: string): CardSet | undefined {
  const wanted = setSlug.toLowerCase();
  return SETS.find(
    (s) => s.gameSlug === gameSlug && s.code.toLowerCase() === wanted,
  );
}

export function countCardsInGame(gameSlug: string): number {
  const codes = new Set(listSets(gameSlug).map((s) => s.code));
  return CARDS.filter((c) => codes.has(c.setCode)).length;
}

export function getGameLastUpdated(gameSlug: string): string | null {
  const codes = new Set(listSets(gameSlug).map((s) => s.code));
  let newest: string | null = null;
  for (const card of CARDS) {
    if (!codes.has(card.setCode)) continue;
    for (const variant of variantsByCard.get(card.id) ?? []) {
      const latest = latestNm.get(variant.id);
      if (latest && (!newest || latest.recordedAt > newest)) newest = latest.recordedAt;
    }
  }
  return newest;
}

// ---------- การ์ด ----------

export function getVariants(cardId: string): Variant[] {
  return variantsByCard.get(cardId) ?? [];
}

export function getCardBySlug(slug: string): Card | undefined {
  return cardBySlug.get(slug);
}

export function getCardById(id: string): Card | undefined {
  return cardById.get(id);
}

/** การ์ดทั้งหมดในชุด พร้อมราคาที่แพงที่สุดในบรรดา variant (ตัวที่คนอยากเห็น) */
export function listCardsInSet(setCode: string): CardWithPrice[] {
  const set = setByCode.get(setCode);
  if (!set) return [];

  return CARDS.filter((c) => c.setCode === setCode).map((card) => {
    const variants = getVariants(card.id);
    let headline: PriceCurrent | null = null;
    for (const variant of variants) {
      const price = currentPrice(variant.id, "NM");
      if (price && (!headline || price.priceThb > headline.priceThb)) headline = price;
    }
    return { card, set, variants, headline };
  });
}

/** ตารางราคา variant × condition สำหรับหน้ารายละเอียดการ์ด */
export function getPriceTable(
  cardId: string,
  conditions: Condition[],
): { variant: Variant; prices: (PriceCurrent | null)[] }[] {
  return getVariants(cardId).map((variant) => ({
    variant,
    prices: conditions.map((condition) => currentPrice(variant.id, condition)),
  }));
}

export function getCurrentPrice(variantId: string, condition: Condition): PriceCurrent | null {
  return currentPrice(variantId, condition);
}

/** ราคาย้อนหลังของ variant หนึ่ง สำหรับวาดกราฟ */
export function getHistory(variantId: string, days = HISTORY_DAYS): PricePoint[] {
  return historyStore
    .filter((p) => p.variantId === variantId)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .slice(-days);
}

/** การ์ดที่ราคาขยับแรงที่สุดใน 7 วัน */
export function listMovers(limit = 12, gameSlug?: string): Mover[] {
  const rows: Mover[] = [];

  for (const variant of VARIANTS) {
    const card = cardById.get(variant.cardId);
    if (!card) continue;
    const set = setByCode.get(card.setCode);
    if (!set) continue;
    if (gameSlug && set.gameSlug !== gameSlug) continue;

    const price = currentPrice(variant.id, "NM");
    if (!price || price.change7d === null) continue;
    rows.push({ card, set, variant, price });
  }

  return rows
    .sort((a, b) => Math.abs(b.price.change7d!) - Math.abs(a.price.change7d!))
    .slice(0, limit);
}

// ---------- แดชบอร์ด ----------

export interface AdminPriceRow {
  card: Card;
  variant: Variant;
  current: PriceCurrent | null;
  staleDays: number | null;
}

export function listAdminPriceRows(setCode: string): AdminPriceRow[] {
  const now = Date.now();

  return CARDS.filter((c) => c.setCode === setCode).flatMap((card) =>
    getVariants(card.id).map((variant) => {
      const current = currentPrice(variant.id, "NM");
      const staleDays = current
        ? Math.floor((now - new Date(current.updatedAt).getTime()) / 86400000)
        : null;
      return { card, variant, current, staleDays };
    }),
  );
}

export interface AdminStats {
  games: number;
  sets: number;
  cards: number;
  variants: number;
  stale: number;
  lastUpdated: string | null;
}

const STALE_AFTER_DAYS = 7;

export function getAdminStats(): AdminStats {
  const now = Date.now();
  let stale = 0;
  let lastUpdated: string | null = null;

  for (const variant of VARIANTS) {
    const latest = latestNm.get(variant.id);
    if (!latest) {
      stale++;
      continue;
    }
    const ageDays = (now - new Date(latest.recordedAt).getTime()) / 86400000;
    if (ageDays > STALE_AFTER_DAYS) stale++;
    if (!lastUpdated || latest.recordedAt > lastUpdated) lastUpdated = latest.recordedAt;
  }

  return {
    games: GAMES.length,
    sets: SETS.length,
    cards: CARDS.length,
    variants: VARIANTS.length,
    stale,
    lastUpdated,
  };
}

/**
 * บันทึกราคาใหม่ — เพิ่มแถวใหม่เสมอ ไม่เขียนทับของเดิม
 * ประวัติราคาคือสินทรัพย์ของโปรเจกต์นี้ (ดู docs/PLAN.md ข้อ 4)
 *
 * หมายเหตุโหมดสาธิต: ข้อมูลอยู่ในหน่วยความจำของ process เท่านั้น
 * บน Vercel จะหายเมื่อ instance ถูกรีไซเคิล — ต้องต่อฐานข้อมูลจริงก่อนใช้งานจริง
 */
export function setPrice(
  variantId: string,
  condition: Condition,
  priceThb: number,
): PriceCurrent | null {
  if (!variantById.has(variantId)) return null;
  if (!Number.isFinite(priceThb) || priceThb <= 0) return null;

  // ราคาที่กรอกอิงสภาพใด ๆ ก็ได้ แต่เก็บลงเป็นฐาน NM เพื่อให้สอดคล้องกับข้อมูลตัวอย่าง
  const nmEquivalent = Math.round(priceThb / CONDITION_MULTIPLIER[condition]);

  historyStore.push({
    variantId,
    condition: "NM",
    priceThb: nmEquivalent,
    recordedAt: new Date().toISOString(),
  });

  reindexPrices();
  return currentPrice(variantId, condition);
}
