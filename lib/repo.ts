import {
  CARDS as SEED_CARDS,
  CONDITION_MULTIPLIER,
  GAMES,
  GRADING_COST_THB,
  HISTORY_DAYS,
  SETS as SEED_SETS,
  VARIANTS as SEED_VARIANTS,
  nmToPsa10,
  psa10ToNm,
  slugify,
} from "./seed";
import { cache } from "react";
import { catalogStore, type WriteResult } from "./catalog-store";
import { EMPTY_OVERRIDES, type LoadedOverrides, type Overrides } from "./overrides";
import { extractSnkrdunkCode } from "./snkrdunk";
import { VARIANT_LABEL } from "./types";
import type {
  Card,
  CardSet,
  CardWithPrice,
  Condition,
  Game,
  Language,
  Mover,
  PricePoint,
  PriceCurrent,
  PriceSource,
  Variant,
  VariantType,
} from "./types";

/**
 * ชั้นเข้าถึงข้อมูลทั้งหมดของแอปอยู่ในไฟล์นี้ไฟล์เดียว
 * หน้าเว็บสาธารณะและแดชบอร์ดอ่าน/เขียนผ่านฟังก์ชันชุดเดียวกัน
 * ของที่เพิ่มในแดชบอร์ดจึงขึ้นบนหน้าเว็บทันที
 *
 * สถานะปัจจุบัน = ข้อมูลตั้งต้นใน seed.ts + ส่วนต่างที่แอดมินแก้ ซึ่งเก็บใน
 * Vercel Blob (ดู overrides.ts) เมื่อจะย้ายไป Postgres ให้แทนที่เนื้อในของ
 * ฟังก์ชันเหล่านี้ด้วย query โดยไม่ต้องแก้หน้าเว็บสักหน้า
 */

/**
 * ที่เก็บข้อมูลที่ใช้อยู่จริงตอนนี้
 * supabase = ตารางจริงใน Postgres · blob = Vercel Blob
 * file = ไฟล์ในเครื่อง · none = เขียนอะไรไม่ได้เลย
 */
export const STORAGE_KIND = catalogStore.kind;

/** บันทึกได้ไหม */
export function canPersist(): boolean {
  return catalogStore.writable();
}

// ---------- สร้างสถานะปัจจุบันจากข้อมูลตั้งต้น + ส่วนต่าง ----------

interface Snapshot {
  sets: CardSet[];
  cards: Card[];
  variants: Variant[];
  /** ราคาที่แอดมินกรอกเอง แยกตาม variant — ของสมมติไม่ได้เก็บไว้ตรงนี้ */
  recordedByVariant: Map<string, PricePoint[]>;
  cardById: Map<string, Card>;
  cardBySlug: Map<string, Card>;
  setByCode: Map<string, CardSet>;
  variantById: Map<string, Variant>;
  variantsByCard: Map<string, Variant[]>;
  latestNm: Map<string, PricePoint>;
  weekAgoNm: Map<string, number>;
}

/** สำเนาข้อมูลของ request ปัจจุบัน กับดัชนีที่สร้างจากสำเนานั้น — เป็นแคชล้วน ๆ */
let loaded: LoadedOverrides = { overrides: EMPTY_OVERRIDES, key: "empty" };
let cachedSnapshot: Snapshot | null = null;
let cachedKey: string | null = null;

function build(overrides: Overrides): Snapshot {
  const deleted = new Set(overrides.deletedCardIds);
  const deletedSets = new Set(overrides.deletedSetCodes);

  const sets = [...SEED_SETS, ...overrides.sets].filter((set) => !deletedSets.has(set.code));

  // ลบชุดแล้วการ์ดในชุดต้องหายตามไปด้วย ไม่งั้นจะเหลือการ์ดที่ไม่มีชุดสังกัด
  // แล้วหน้าเว็บจะพังตอนหาชื่อชุดของมัน
  const cards = [...SEED_CARDS, ...overrides.cards]
    .filter((card) => !deleted.has(card.id) && !deletedSets.has(card.setCode))
    .map((card) => {
      const edit = overrides.cardEdits[card.id];
      return edit ? { ...card, ...edit } : card;
    });

  // เวอร์ชันกับราคาผูกกับการ์ดที่ยังอยู่เท่านั้น ตัดจากรายชื่อการ์ดจริงทีเดียว
  // จะได้ครอบคลุมทั้งการ์ดที่ถูกลบตรง ๆ และการ์ดที่หายไปพร้อมชุด
  const liveCardIds = new Set(cards.map((card) => card.id));

  const variants = [...SEED_VARIANTS, ...overrides.variants].filter((variant) =>
    liveCardIds.has(variant.cardId),
  );

  const variantsByCard = new Map<string, Variant[]>();
  for (const variant of variants) {
    const list = variantsByCard.get(variant.cardId) ?? [];
    list.push(variant);
    variantsByCard.set(variant.cardId, list);
  }

  const recordedByVariant = new Map<string, PricePoint[]>();
  for (const point of overrides.pricePoints) {
    if (!liveCardIds.has(point.variantId)) continue;
    const list = recordedByVariant.get(point.variantId) ?? [];
    list.push(point);
    recordedByVariant.set(point.variantId, list);
  }
  for (const list of recordedByVariant.values()) {
    list.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }

  /*
    ราคาทั้งหมดมาจากที่คนกรอกเท่านั้น ใบไหนยังไม่มีใครกรอกก็คือยังไม่มีราคา
    เว็บจะขึ้นว่า "—" ไม่ใช่เดาตัวเลขให้ เพราะเว็บราคาที่เดาราคาเองเชื่อไม่ได้

    นับเฉพาะราคาตลาดหลัก ราคาจาก eBay/SNKRDUNK เป็นข้อมูลเทียบคนละก้อน
  */
  const latestNm = new Map<string, PricePoint>();
  const weekAgoNm = new Map<string, number>();

  for (const [variantId, points] of recordedByVariant) {
    const market = points.filter(isMarketPrice);
    if (market.length === 0) continue;

    const latest = market[market.length - 1];
    latestNm.set(variantId, latest);

    // ต้องมีราคาที่บันทึกไว้ก่อนหน้าอย่างน้อย 7 วันถึงจะคิด % ขยับได้
    const cutoff = new Date(latest.recordedAt).getTime() - 7 * 86400000;
    const earlier = market.filter((p) => new Date(p.recordedAt).getTime() <= cutoff);
    if (earlier.length > 0) {
      weekAgoNm.set(variantId, earlier[earlier.length - 1].priceThb);
    }
  }

  return {
    sets,
    cards,
    variants,
    recordedByVariant,
    cardById: new Map(cards.map((c) => [c.id, c])),
    cardBySlug: new Map(cards.map((c) => [c.slug, c])),
    setByCode: new Map(sets.map((s) => [s.code, s])),
    variantById: new Map(variants.map((v) => [v.id, v])),
    variantsByCard,
    latestNm,
    weekAgoNm,
  };
}

/**
 * โหลดส่วนต่างจากที่เก็บข้อมูล — ต้องเรียกก่อนอ่านข้อมูลในทุกหน้า
 *
 * ที่เก็บข้อมูลเป็น Blob ซึ่งอ่านแบบ async เท่านั้น แต่ฟังก์ชันอ่านทั้งหมด
 * ข้างล่างเป็น sync (หน้าเว็บเรียกกันหลายสิบจุด) จึงแยกเป็นสองจังหวะ:
 * โหลดทีเดียวตอนต้น request แล้วที่เหลืออ่านจากสำเนาในหน่วยความจำ
 *
 * cache() ของ React ทำให้เรียกซ้ำกี่ครั้งใน request เดียวก็ยิงจริงครั้งเดียว
 */
export const loadState = cache(async (): Promise<void> => {
  loaded = await catalogStore.load();
});

/** สร้างดัชนีใหม่เฉพาะเมื่อข้อมูลที่โหลดมาเปลี่ยนจริง */
function snap(): Snapshot {
  if (cachedSnapshot && cachedKey === loaded.key) return cachedSnapshot;

  cachedSnapshot = build(loaded.overrides);
  cachedKey = loaded.key;
  return cachedSnapshot;
}

/**
 * รับผลของการเขียนหนึ่งครั้งมาปรับสำเนาในหน่วยความจำให้ตรงทันที
 *
 * ที่เก็บข้อมูลคืนสถานะล่าสุดกลับมาให้ด้วย ไม่ใช่แค่สำเร็จ/ไม่สำเร็จ เพราะ
 * โค้ดที่เรียกต้องอ่านของที่เพิ่งบันทึกกลับมาแสดงต่อในคำขอเดียวกัน
 */
function applied(result: WriteResult): boolean {
  if (!result) return false;

  loaded = result;
  cachedSnapshot = build(result.overrides);
  cachedKey = result.key;
  return true;
}

/** ราคาที่ไม่ระบุช่องทาง ถือเป็นราคาตลาดหลัก (ข้อมูลเก่าก่อนมีช่องทาง) */
function isMarketPrice(point: PricePoint): boolean {
  return point.source === undefined || point.source === "market";
}

function currentPrice(variantId: string, condition: Condition): PriceCurrent | null {
  const { latestNm, weekAgoNm } = snap();
  const latest = latestNm.get(variantId);
  if (!latest) return null;

  const nm = latest.priceThb;
  // ไม่มีราคาเมื่อ 7 วันก่อน = เทียบไม่ได้ ต้องเป็น null ไม่ใช่ 0%
  const before = weekAgoNm.get(variantId);
  const change7d = before && before > 0 ? ((nm - before) / before) * 100 : null;

  return {
    variantId,
    condition,
    priceThb:
      condition === "PSA10"
        ? nmToPsa10(nm, variantId)
        : Math.round(nm * CONDITION_MULTIPLIER[condition]),
    change7d: change7d === null ? null : Math.round(change7d * 10) / 10,
    updatedAt: latest.recordedAt,
  };
}

// ---------- อ่าน: แคตตาล็อก ----------

export function listGames(): Game[] {
  return GAMES;
}

export function getGame(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug);
}

/**
 * ลำดับชุดที่คนอ่านคาดหวัง: บูสเตอร์หลัก OP-01 ถึง OP-17 เรียงจากเก่าไปใหม่
 * ตามด้วย EB แล้วค่อย PRB — ไม่ได้เรียงตามวันวางจำหน่าย เพราะชุดเสริม
 * ออกสลับกับชุดหลักตลอด ถ้าเรียงตามวันจะกระจายแทรกกันจนหาชุดที่ต้องการไม่เจอ
 */
const SET_GROUP: Record<string, number> = { OP: 0, EB: 1, PRB: 2 };

function setOrder(a: CardSet, b: CardSet): number {
  const groupOf = (code: string) => SET_GROUP[code.split("-")[0]] ?? 9;
  const diff = groupOf(a.code) - groupOf(b.code);
  return diff !== 0 ? diff : a.code.localeCompare(b.code, undefined, { numeric: true });
}

export function listSets(gameSlug: string): CardSet[] {
  return snap()
    .sets.filter((s) => s.gameSlug === gameSlug)
    .sort(setOrder);
}

export function listAllSets(): CardSet[] {
  return [...snap().sets].sort(setOrder);
}

export function getSet(code: string): CardSet | undefined {
  return snap().setByCode.get(code);
}

export function getSetBySlug(gameSlug: string, setSlug: string): CardSet | undefined {
  const wanted = setSlug.toLowerCase();
  return snap().sets.find(
    (s) => s.gameSlug === gameSlug && s.code.toLowerCase() === wanted,
  );
}

export function countCardsInGame(gameSlug: string): number {
  const codes = new Set(listSets(gameSlug).map((s) => s.code));
  return snap().cards.filter((c) => codes.has(c.setCode)).length;
}

export function getGameLastUpdated(gameSlug: string): string | null {
  const { cards, variantsByCard, latestNm } = snap();
  const codes = new Set(listSets(gameSlug).map((s) => s.code));

  let newest: string | null = null;
  for (const card of cards) {
    if (!codes.has(card.setCode)) continue;
    for (const variant of variantsByCard.get(card.id) ?? []) {
      const latest = latestNm.get(variant.id);
      if (latest && (!newest || latest.recordedAt > newest)) newest = latest.recordedAt;
    }
  }
  return newest;
}

// ---------- อ่าน: การ์ด ----------

export function getVariants(cardId: string): Variant[] {
  return snap().variantsByCard.get(cardId) ?? [];
}

export function getCardBySlug(slug: string): Card | undefined {
  return snap().cardBySlug.get(slug);
}

export function getCardById(id: string): Card | undefined {
  return snap().cardById.get(id);
}

/** การ์ดทั้งหมดในชุด พร้อมราคาที่แพงที่สุดในบรรดา variant (ตัวที่คนเข้ามาดู) */
export function listCardsInSet(setCode: string): CardWithPrice[] {
  const state = snap();
  const set = state.setByCode.get(setCode);
  if (!set) return [];

  return state.cards
    .filter((c) => c.setCode === setCode)
    .sort((a, b) => a.number.localeCompare(b.number))
    .map((card) => {
      const variants = getVariants(card.id);
      let headline: PriceCurrent | null = null;
      for (const variant of variants) {
        const price = currentPrice(variant.id, "NM");
        if (price && (!headline || price.priceThb > headline.priceThb)) headline = price;
      }
      return { card, set, variants, headline };
    });
}

/** จำนวนการ์ดที่หน้าแรกโชว์ในกรอบพัด */
export const FEATURED_SLOTS = 3;

/**
 * การ์ดที่โชว์บนหน้าแรก
 *
 * ถ้าปักหมุดไว้ก็ใช้ตามนั้น ไม่งั้นเลือกใบที่แพงที่สุดให้ และถ้ายังไม่มีราคา
 * เลยก็หยิบใบแรก ๆ มาแทน เพราะ hero ที่ว่างเปล่าดูเหมือนเว็บพัง
 */
export function listFeaturedCards(): CardWithPrice[] {
  const state = snap();
  const pinned = loaded.overrides.featuredCardIds
    .map((id) => cardWithPrice(state.cardById.get(id)))
    .filter((row): row is CardWithPrice => row !== null);

  if (pinned.length >= FEATURED_SLOTS) return pinned.slice(0, FEATURED_SLOTS);

  const used = new Set(pinned.map((row) => row.card.id));
  const rest = listAllSets()
    .flatMap((set) => listCardsInSet(set.code))
    .filter((row) => !used.has(row.card.id))
    .sort((a, b) => (b.headline?.priceThb ?? 0) - (a.headline?.priceThb ?? 0));

  return [...pinned, ...rest].slice(0, FEATURED_SLOTS);
}

/** id ที่ปักหมุดไว้จริง ๆ (ไม่รวมตัวที่ระบบเติมให้) — หน้าตั้งค่าใช้แสดงในช่องกรอก */
export function getFeaturedCardIds(): string[] {
  return [...loaded.overrides.featuredCardIds];
}

export async function setFeaturedCards(ids: string[]): Promise<Result<string[]>> {
  const state = snap();
  const clean: string[] = [];

  for (const raw of ids) {
    const id = raw.trim().toUpperCase();
    if (!id) continue;
    if (!state.cardById.has(id)) {
      return { ok: false, error: `ไม่พบการ์ดเลข ${id}` };
    }
    if (!clean.includes(id)) clean.push(id);
  }

  const ok = applied(await catalogStore.setFeatured(clean.slice(0, FEATURED_SLOTS)));

  if (!ok) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: clean };
}

/** ประกอบการ์ดหนึ่งใบให้อยู่ในรูปเดียวกับที่หน้าเว็บใช้ (มีชุดกับราคาติดมาด้วย) */
function cardWithPrice(card: Card | undefined): CardWithPrice | null {
  if (!card) return null;

  const set = snap().setByCode.get(card.setCode);
  if (!set) return null;

  const variants = getVariants(card.id);
  let headline: PriceCurrent | null = null;
  for (const variant of variants) {
    const price = currentPrice(variant.id, "NM");
    if (price && (!headline || price.priceThb > headline.priceThb)) headline = price;
  }

  return { card, set, variants, headline };
}

/**
 * ค้นการ์ดจากชื่อ (ไทยหรืออังกฤษ) หรือเลขการ์ด
 *
 * ไล่ทีละใบตรง ๆ เพราะแคตตาล็อกมีไม่กี่พันใบ ยังเร็วกว่าการสร้างดัชนีค้นหา
 * ไว้ในหน่วยความจำแล้วต้องคอยดูแลให้ตรงกับข้อมูลที่แอดมินแก้
 *
 * เรียงผลลัพธ์: ขึ้นต้นตรงคำค้นมาก่อน แล้วค่อยตัวที่มีคำค้นอยู่กลางชื่อ
 * ในกลุ่มเดียวกันเรียงตามราคาสูงไปต่ำ เพราะคนค้นชื่อตัวละครมักหาใบแพงก่อน
 */
export function searchCards(query: string, limit = 60): CardWithPrice[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const state = snap();
  const scored: { row: CardWithPrice; rank: number }[] = [];

  for (const card of state.cards) {
    const fields = [card.nameTh.toLowerCase(), card.nameEn.toLowerCase(), card.number.toLowerCase()];
    const rank = fields.some((f) => f.startsWith(q))
      ? 0
      : fields.some((f) => f.includes(q))
        ? 1
        : -1;
    if (rank < 0) continue;

    const set = state.setByCode.get(card.setCode);
    if (!set) continue;

    const variants = getVariants(card.id);
    let headline: PriceCurrent | null = null;
    for (const variant of variants) {
      const price = currentPrice(variant.id, "NM");
      if (price && (!headline || price.priceThb > headline.priceThb)) headline = price;
    }

    scored.push({ row: { card, set, variants, headline }, rank });
  }

  return scored
    .sort(
      (a, b) =>
        a.rank - b.rank || (b.row.headline?.priceThb ?? 0) - (a.row.headline?.priceThb ?? 0),
    )
    .slice(0, limit)
    .map((entry) => entry.row);
}

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

/**
 * ราคาล่าสุดจากช่องทางหนึ่ง (eBay / SNKRDUNK)
 *
 * ต่างจากราคาหลักตรงที่ไม่มีของสมมติมารองรับ — ถ้ายังไม่มีใครกรอกก็คือไม่มี
 * เพราะการเดาราคาของตลาดต่างประเทศแล้วโชว์เหมือนของจริงคือการโกหกผู้ใช้
 */
export function getChannelPrice(
  variantId: string,
  condition: Condition,
  source: PriceSource,
): PriceCurrent | null {
  // ราคาช่องทางอื่นเก็บตามสภาพที่สังเกตจริงแยกกันไว้แล้ว (ดู setPrice) จึงกรอง
  // ด้วยสภาพตรง ๆ ไม่ต้องคำนวณผ่านเบี้ยสังเคราะห์เหมือนราคาตลาดหลัก
  const recorded = (snap().recordedByVariant.get(variantId) ?? []).filter(
    (p) => p.source === source && p.condition === condition,
  );
  if (recorded.length === 0) return null;

  const latest = recorded[recorded.length - 1];
  const cutoff = new Date(latest.recordedAt).getTime() - 7 * 86400000;
  const earlier = recorded.filter((p) => new Date(p.recordedAt).getTime() <= cutoff);
  const before = earlier.length > 0 ? earlier[earlier.length - 1].priceThb : null;

  return {
    variantId,
    condition,
    priceThb: latest.priceThb,
    change7d: before && before > 0 ? Math.round(((latest.priceThb - before) / before) * 1000) / 10 : null,
    updatedAt: latest.recordedAt,
  };
}

/** กราฟย้อนหลังของ variant เดียว — มีเท่าที่คนกรอกไว้จริง */
export function getHistory(variantId: string, days = HISTORY_DAYS): PricePoint[] {
  return (snap().recordedByVariant.get(variantId) ?? [])
    .filter(isMarketPrice)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .slice(-days);
}

export function listMovers(limit = 12, gameSlug?: string): Mover[] {
  const state = snap();
  const rows: Mover[] = [];

  for (const variant of state.variants) {
    const card = state.cardById.get(variant.cardId);
    if (!card) continue;
    const set = state.setByCode.get(card.setCode);
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

// ---------- อ่าน: แดชบอร์ด ----------

/**
 * ราคาทั้งสี่ช่องที่แดชบอร์ดกรอกได้ของการ์ดหนึ่งใบ
 *
 * nm กับ psa10 มาจากราคาตลาดหลักชุดเดียวกัน — psa10 คือ nm ที่บวกเบี้ยเกรดแล้ว
 * แก้ช่องไหนอีกช่องจึงขยับตาม ส่วน ebay/snkrdunk เป็นคนละชุดข้อมูล ไม่เกี่ยวกัน
 */
export interface AdminPriceSet {
  nm: number | null;
  psa10: number | null;
  ebay: number | null;
  snkrdunk: number | null;
  /** ราคาเกรด PSA 10 ต่ำสุดที่สังเกตจาก SNKRDUNK จริง — คนละก้อนกับ psa10 สังเคราะห์จาก NM */
  snkrdunkPsa10: number | null;
}

export function getAdminPrices(variantId: string): AdminPriceSet {
  return {
    nm: currentPrice(variantId, "NM")?.priceThb ?? null,
    psa10: currentPrice(variantId, "PSA10")?.priceThb ?? null,
    ebay: getChannelPrice(variantId, "NM", "ebay")?.priceThb ?? null,
    snkrdunk: getChannelPrice(variantId, "NM", "snkrdunk")?.priceThb ?? null,
    snkrdunkPsa10: getChannelPrice(variantId, "PSA10", "snkrdunk")?.priceThb ?? null,
  };
}

export interface AdminPriceRow {
  card: Card;
  variant: Variant;
  prices: AdminPriceSet;
  /** ราคาตลาดหลักถูกบันทึกไว้เมื่อกี่วันก่อน — null = ยังไม่เคยมีราคา */
  staleDays: number | null;
}

export function listAdminPriceRows(setCode: string): AdminPriceRow[] {
  const now = Date.now();

  return snap()
    .cards.filter((c) => c.setCode === setCode)
    .sort((a, b) => a.number.localeCompare(b.number))
    .flatMap((card) =>
      getVariants(card.id).map((variant) => {
        const current = currentPrice(variant.id, "NM");
        const staleDays = current
          ? Math.floor((now - new Date(current.updatedAt).getTime()) / 86400000)
          : null;
        return { card, variant, prices: getAdminPrices(variant.id), staleDays };
      }),
    );
}

export interface SnkrdunkSyncTarget {
  card: Card;
  variantId: string;
  snkrdunkCode: string;
}

/**
 * การ์ดทุกใบที่ผูกเลขสินค้า SNKRDUNK ไว้ — ใบไหนไม่ได้ใส่ก็ไม่ติดในรายการนี้
 * นี่คือรายการที่ job ซิงก์ราคาอัตโนมัติจะไปดึงราคามาอัปเดตให้
 */
export function listSnkrdunkSyncTargets(): SnkrdunkSyncTarget[] {
  const targets: (SnkrdunkSyncTarget & { checkedAt: string })[] = [];
  for (const card of snap().cards) {
    const snkrdunkCode = card.snkrdunkCode?.trim();
    if (!snkrdunkCode) continue;
    const variant = getVariants(card.id)[0];
    if (!variant) continue;
    // ไม่เคยลองซิงก์เลย = เก่าสุด (ต้องได้คิวก่อน) แทนด้วยค่าว่างซึ่งเรียงมาก่อนวันที่จริงเสมอ
    // ใช้เวลา "ลองซิงก์ล่าสุด" ไม่ใช่เวลาที่ได้ราคาจริง เพราะใบที่ยังไม่มีคนลงขาย
    // จะไม่เคยได้ราคาเลย ถ้าใช้เวลาบันทึกราคาเป็นตัวจัดคิวจะค้างหัวคิวตลอดไป
    // จนใบอื่นไม่ได้คิวสักที
    const checkedAt = card.snkrdunkCheckedAt ?? "";
    targets.push({ card, variantId: variant.id, snkrdunkCode, checkedAt });
  }
  // ใบที่ไม่เคยลองซิงก์หรือลองมานานสุดได้คิวก่อนเสมอ — ให้ทุกครั้งที่เรียก
  // (ปุ่มกดเอง หรือ cron รายวัน) คืบหน้าไปเรื่อย ๆ แม้ทำทั้งหมดในครั้งเดียวไม่ไหว
  return targets.sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
}

/** ปักเวลาที่เพิ่งลองซิงก์ราคาให้การ์ดใบนี้ ไม่ว่าจะได้ราคากลับมาหรือไม่ก็ตาม
 * ใช้จัดคิว listSnkrdunkSyncTargets เท่านั้น ไม่ใช่ราคา จึงไม่ต้องเก็บประวัติ */
export async function markSnkrdunkChecked(cardId: string, checkedAt: string): Promise<void> {
  const ok = applied(await catalogStore.editCard(cardId, { snkrdunkCheckedAt: checkedAt }));
  if (!ok) console.error(`markSnkrdunkChecked ล้มเหลว: ${cardId}`);
}

export interface AdminStats {
  games: number;
  sets: number;
  cards: number;
  /** จำนวนเลขการ์ดที่ไม่ซ้ำ — น้อยกว่าจำนวนใบ เพราะใบพิเศษใช้เลขเดิม */
  numbers: number;
  variants: number;
  stale: number;
  lastUpdated: string | null;
}

const STALE_AFTER_DAYS = 7;

export function getAdminStats(): AdminStats {
  const state = snap();
  const now = Date.now();
  let stale = 0;
  let lastUpdated: string | null = null;

  for (const variant of state.variants) {
    const latest = state.latestNm.get(variant.id);
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
    sets: state.sets.length,
    cards: state.cards.length,
    numbers: new Set(state.cards.map((card) => card.number)).size,
    variants: state.variants.length,
    stale,
    lastUpdated,
  };
}

// ---------- เขียน ----------

const NOT_WRITABLE =
  "บันทึกไม่สำเร็จ — ที่เก็บข้อมูลไม่ตอบสนอง ลองใหม่อีกครั้ง";

/**
 * บันทึกราคาใหม่ — เพิ่มแถวใหม่เสมอ ไม่เขียนทับของเดิม
 * ประวัติราคาคือสินทรัพย์ของโปรเจกต์นี้ (ดู docs/PLAN.md ข้อ 4)
 */
export async function setPrice(
  variantId: string,
  condition: Condition,
  priceThb: number,
  source: PriceSource = "market",
): Promise<Result<PriceCurrent>> {
  if (!snap().variantById.has(variantId)) {
    return { ok: false, error: "ไม่พบเวอร์ชันการ์ดนี้" };
  }
  if (!Number.isFinite(priceThb) || priceThb <= 0) {
    return { ok: false, error: "ราคาต้องเป็นตัวเลขมากกว่า 0" };
  }

  /*
    ราคาตลาดหลัก (market) อิงสภาพใดก็ได้ แต่เก็บเป็นฐาน NM เพื่อให้เทียบกันได้
    ทั้งระบบ — NM กับ PSA10 จึงเป็นคู่เดียวกันคำนวณกลับไปมาผ่านเบี้ยสังเคราะห์

    ราคาจากช่องทางอื่น (eBay/SNKRDUNK) ไม่ผ่านการแปลงนี้เลย เพราะเป็นตัวเลขจริง
    ที่สังเกตมาตรง ๆ ต่อสภาพนั้น ๆ — เอาไปแปลงกลับไปกลับมาด้วยเบี้ยสังเคราะห์ของ
    เราเองจะได้ตัวเลขที่ไม่ใช่ราคาจริงอีกต่อไป จึงเก็บแยกตามสภาพที่สังเกตจริง
  */
  const isChannel = source !== "market";
  const nmEquivalent = isChannel
    ? priceThb
    : condition === "PSA10"
      ? psa10ToNm(priceThb, variantId)
      : Math.round(priceThb / CONDITION_MULTIPLIER[condition]);

  // ราคาใบเกรดที่ต่ำกว่าค่าส่งเกรด ถอดกลับเป็นราคาดิบแล้วได้ค่าติดลบ
  // แปลว่าตัวเลขที่กรอกเป็นไปไม่ได้ในความจริง ต้องบอกให้ชัดว่าทำไม
  if (nmEquivalent <= 0) {
    return {
      ok: false,
      error:
        condition === "PSA10" && !isChannel
          ? `ราคา PSA 10 ต้องมากกว่าค่าส่งเกรด ฿${GRADING_COST_THB.toLocaleString("th-TH")} เพราะไม่มีใครขายใบที่ส่งเกรดแล้วถูกกว่าต้นทุน`
          : "ราคาต่ำเกินไปจนแปลงกลับเป็นราคาสภาพ NM ไม่ได้",
    };
  }

  const ok = applied(
    await catalogStore.addPricePoints([
      {
        variantId,
        condition: isChannel ? condition : "NM",
        priceThb: nmEquivalent,
        recordedAt: new Date().toISOString(),
        source,
      },
    ]),
  );

  if (!ok) return { ok: false, error: NOT_WRITABLE };

  const saved =
    source === "market"
      ? currentPrice(variantId, condition)
      : getChannelPrice(variantId, condition, source);

  return saved ? { ok: true, value: saved } : { ok: false, error: NOT_WRITABLE };
}

export interface NewSetInput {
  gameSlug: string;
  code: string;
  nameTh: string;
  nameEn: string;
  language: Language;
  releaseDate: string;
  totalCards: number;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export async function createSet(input: NewSetInput): Promise<Result<CardSet>> {
  const code = input.code.trim().toUpperCase();

  if (!code) return { ok: false, error: "ต้องระบุรหัสชุด" };
  if (!getGame(input.gameSlug)) return { ok: false, error: "ไม่พบเกมนี้" };
  if (snap().setByCode.has(code)) return { ok: false, error: `มีชุดรหัส ${code} อยู่แล้ว` };
  if (!input.nameTh.trim()) return { ok: false, error: "ต้องระบุชื่อชุดภาษาไทย" };

  const set: CardSet = {
    code,
    gameSlug: input.gameSlug,
    nameTh: input.nameTh.trim(),
    nameEn: input.nameEn.trim() || input.nameTh.trim(),
    language: input.language,
    releaseDate: input.releaseDate,
    totalCards: Math.max(0, Math.round(input.totalCards)),
  };

  if (!applied(await catalogStore.addSet(set))) {
    return { ok: false, error: NOT_WRITABLE };
  }
  return { ok: true, value: set };
}

/**
 * ลบทั้งชุด — การ์ด เวอร์ชัน และราคาทั้งหมดในชุดหายตามไปด้วย
 * คืนจำนวนการ์ดที่หายไปเพื่อให้หน้าแดชบอร์ดบอกผู้ใช้ได้ว่าลบอะไรไปบ้าง
 */
export async function deleteSet(code: string): Promise<Result<{ cards: number }>> {
  const set = snap().setByCode.get(code);
  if (!set) return { ok: false, error: "ไม่พบชุดนี้" };

  const cards = snap().cards.filter((card) => card.setCode === code).length;

  const ok = applied(await catalogStore.removeSet(code));

  if (!ok) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: { cards } };
}

export interface NewCardInput {
  setCode: string;
  number: string;
  nameTh: string;
  nameEn: string;
  rarity: string;
  cardType: string;
  color: string;
  variantTypes: VariantType[];
  priceThb: number | null;
  sourceUrl: string;
}

/**
 * ตรวจลิงก์ต้นทางราคา — ว่างได้ (แปลว่ายังไม่ได้ผูกต้นทาง) แต่ถ้ากรอกมา
 * ต้องเป็น http/https จริง ๆ ไม่งั้นลิงก์ที่กดไม่ได้จะไปนั่งอยู่ในตารางเฉย ๆ
 * และ javascript: กับ data: ต้องกันไว้ตั้งแต่ตอนบันทึก เพราะปลายทางคือ href
 */
function cleanSourceUrl(raw: string): Result<string> {
  const value = raw.trim();
  if (!value) return { ok: true, value: "" };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "ลิงก์ต้นทางต้องขึ้นต้นด้วย http:// หรือ https://" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "ลิงก์ต้นทางต้องขึ้นต้นด้วย http:// หรือ https://" };
  }
  return { ok: true, value: parsed.toString() };
}

export async function createCard(input: NewCardInput): Promise<Result<Card>> {
  const state = snap();
  const number = input.number.trim().toUpperCase();

  if (!state.setByCode.has(input.setCode)) return { ok: false, error: "ไม่พบชุดนี้" };
  if (!number) return { ok: false, error: "ต้องระบุเลขการ์ด" };
  if (!input.nameTh.trim()) return { ok: false, error: "ต้องระบุชื่อการ์ดภาษาไทย" };

  const sourceUrl = cleanSourceUrl(input.sourceUrl);
  if (!sourceUrl.ok) return sourceUrl;

  const nameEn = input.nameEn.trim() || input.nameTh.trim();
  const base = `${slugify(number)}-${slugify(nameEn)}`;

  // เลือกแบบพิมพ์ไว้กี่แบบก็ได้การ์ดเท่านั้นใบ เพราะแต่ละแบบคือของคนละชิ้น
  const printings: VariantType[] = [...new Set<VariantType>(["normal", ...input.variantTypes])];

  const made: Card[] = [];
  for (const variantType of printings) {
    const id = `${number}:${variantType}`;
    if (state.cardById.has(id)) {
      return { ok: false, error: `มีการ์ด ${number} แบบ ${VARIANT_LABEL[variantType]} อยู่แล้ว` };
    }

    const slug = variantType === "normal" ? base : `${base}-${slugify(variantType)}`;
    made.push({
      id,
      // slug คือ URL ถาวร ห้ามชนกัน
      slug: state.cardBySlug.has(slug) ? `${slug}-${slugify(input.setCode)}` : slug,
      setCode: input.setCode,
      number,
      nameTh: input.nameTh.trim(),
      nameEn,
      rarity: input.rarity.trim() || "C",
      cardType: input.cardType.trim() || "Character",
      color: input.color.trim() || "ไม่ระบุ",
      variantType,
      // ทุกแบบพิมพ์ของเลขเดียวกันเริ่มจากลิงก์ต้นทางเดียวกัน แล้วค่อยแก้ทีละใบ
      // ในหน้าแก้ไขได้ ถ้าแต่ละแบบมีหน้าขายของตัวเอง
      ...(sourceUrl.value ? { sourceUrl: sourceUrl.value } : {}),
    });
  }

  const variants: Variant[] = made.map((card) => ({
    id: card.id,
    cardId: card.id,
    variantType: card.variantType,
    isFoil: card.variantType !== "normal",
  }));

  // ราคาที่กรอกตอนสร้างเป็นของใบธรรมดา ใบพิเศษไปกรอกในหน้าอัปเดตราคา
  const firstPrices: PricePoint[] =
    input.priceThb && input.priceThb > 0
      ? [
          {
            variantId: `${number}:normal`,
            condition: "NM",
            priceThb: Math.round(input.priceThb),
            recordedAt: new Date().toISOString(),
            source: "market",
          },
        ]
      : [];

  const ok = applied(await catalogStore.addCards(made, variants, firstPrices));

  if (!ok) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: made[0] };
}

export async function updateCard(
  id: string,
  patch: Partial<
    Pick<
      Card,
      "nameTh" | "nameEn" | "rarity" | "cardType" | "color" | "sourceUrl" | "snkrdunkCode"
    >
  >,
): Promise<Result<Card>> {
  const card = snap().cardById.get(id);
  if (!card) return { ok: false, error: "ไม่พบการ์ดนี้" };
  if (patch.nameTh !== undefined && !patch.nameTh.trim()) {
    return { ok: false, error: "ชื่อการ์ดภาษาไทยว่างไม่ได้" };
  }

  const clean: Partial<Card> = {};

  // ต่างจากช่องอื่นตรงที่ลบทิ้งได้ — ส่งค่าว่างมาแปลว่า "ถอดลิงก์ต้นทางออก"
  // ไม่ใช่ "ไม่ได้แก้ช่องนี้" เพราะไม่งั้นลิงก์ที่ผูกผิดจะเอาออกไม่ได้เลย
  if (patch.sourceUrl !== undefined) {
    const sourceUrl = cleanSourceUrl(patch.sourceUrl);
    if (!sourceUrl.ok) return sourceUrl;
    clean.sourceUrl = sourceUrl.value;

    // ลิงก์ต้นทางที่วางไว้ดันเป็นหน้าสินค้า SNKRDUNK อยู่แล้ว ก็แกะเลขมาผูกให้เลย
    // ไม่ต้องให้กรอกซ้ำอีกช่อง — ใช้ตอนผู้เรียกไม่ได้ส่งช่องเลขสินค้ามาด้วยเลย
    // (เช่น API ผูกลิงก์อย่างเดียว) เว้นแต่คำขอนี้ตั้งใจแก้ช่องเลขสินค้าเองด้วย
    if (patch.snkrdunkCode === undefined) {
      const derived = extractSnkrdunkCode(sourceUrl.value);
      if (derived) clean.snkrdunkCode = derived;
    }
  }
  // ลบทิ้งได้เหมือนลิงก์ต้นทาง — ว่าง = เอาใบนี้ออกจากรายการที่ซิงก์ราคาอัตโนมัติ
  // รับได้ทั้งตัวเลขล้วนหรือวาง URL เต็ม ๆ มา เหมือนช่องลิงก์ต้นทาง
  if (patch.snkrdunkCode !== undefined) {
    const submitted = extractSnkrdunkCode(patch.snkrdunkCode) ?? patch.snkrdunkCode.trim();

    // ฟอร์มแก้การ์ดส่งช่องนี้มาเสมอแม้เว้นว่างไว้ เลยแยกไม่ออกจาก "ไม่ได้แตะช่องนี้"
    // ตรง ๆ — ถือว่าว่าง + ยังไม่เคยผูกเลขมาก่อน + เพิ่งวางลิงก์ต้นทางใหม่มาด้วย คือ
    // ตั้งใจให้แกะเลขจากลิงก์ให้เอง ไม่ใช่ตั้งใจล้าง (ถ้าเคยผูกไว้ก่อนแล้วเว้นว่าง
    // ค่อยถือว่าตั้งใจถอดออกจริง ๆ)
    if (!submitted && !card.snkrdunkCode && clean.sourceUrl) {
      clean.snkrdunkCode = extractSnkrdunkCode(clean.sourceUrl) ?? "";
    } else {
      clean.snkrdunkCode = submitted;
    }
  }
  if (patch.nameTh?.trim()) clean.nameTh = patch.nameTh.trim();
  if (patch.nameEn?.trim()) clean.nameEn = patch.nameEn.trim();
  if (patch.rarity?.trim()) clean.rarity = patch.rarity.trim();
  if (patch.cardType?.trim()) clean.cardType = patch.cardType.trim();
  if (patch.color?.trim()) clean.color = patch.color.trim();

  const ok = applied(await catalogStore.editCard(id, clean));

  if (!ok) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: { ...card, ...clean } };
}

/**
 * ผูกรูปที่อัปโหลดแล้วเข้ากับการ์ด (หรือถอดออกเมื่อส่ง null)
 *
 * เก็บเป็น cardEdits เหมือนการแก้ชื่อ รูปจึงหายไปพร้อมการ์ดถ้าการ์ดถูกลบ
 * และย้ายที่เก็บข้อมูลทีเดียวก็ตามไปทั้งชุด
 */
export async function setCardImage(id: string, imageUrl: string | null): Promise<Result<Card>> {
  const card = snap().cardById.get(id);
  if (!card) return { ok: false, error: "ไม่พบการ์ดนี้" };

  // ถอดรูปออกเก็บเป็นค่าว่าง ไม่ได้ลบคีย์ทิ้ง เพราะ patch ถูกรวมทับของเดิมเสมอ
  // ทั้งสองหลังบ้าน คีย์ที่หายไปจึงแปลว่า "ไม่ได้แก้ช่องนี้" ไม่ใช่ "เอารูปออก"
  const ok = applied(await catalogStore.editCard(id, { imageUrl: imageUrl ?? "" }));

  if (!ok) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: { ...card, imageUrl: imageUrl ?? undefined } };
}

export async function deleteCard(id: string): Promise<Result<true>> {
  if (!snap().cardById.has(id)) return { ok: false, error: "ไม่พบการ์ดนี้" };

  const ok = applied(await catalogStore.removeCard(id));

  if (!ok) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: true };
}
