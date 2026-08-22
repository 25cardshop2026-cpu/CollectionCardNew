import {
  CARDS as SEED_CARDS,
  CONDITION_MULTIPLIER,
  GAMES,
  HISTORY_DAYS,
  SETS as SEED_SETS,
  VARIANTS as SEED_VARIANTS,
  buildHistory,
  nmToPsa10,
  psa10ToNm,
  slugify,
} from "./seed";
import { cache } from "react";
import {
  EMPTY_OVERRIDES,
  isStorageWritable,
  loadOverrides,
  saveOverrides,
  usingBlob,
  type LoadedOverrides,
  type Overrides,
} from "./overrides";
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
 * blob = Vercel Blob (ใช้ได้ทั้งบนเว็บจริงและในเครื่อง)
 * file = ไฟล์ในเครื่อง · none = เขียนอะไรไม่ได้เลย
 */
export const STORAGE_KIND: "blob" | "file" | "none" = usingBlob()
  ? "blob"
  : isStorageWritable()
    ? "file"
    : "none";

/** บันทึกได้ไหม */
export function canPersist(): boolean {
  return STORAGE_KIND !== "none";
}

// ---------- สร้างสถานะปัจจุบันจากข้อมูลตั้งต้น + ส่วนต่าง ----------

interface Snapshot {
  sets: CardSet[];
  cards: Card[];
  variants: Variant[];
  history: PricePoint[];
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

  const history = [...buildHistory(), ...overrides.pricePoints].filter((point) =>
    liveCardIds.has(point.variantId.split(":")[0]),
  );

  const variantsByCard = new Map<string, Variant[]>();
  for (const variant of variants) {
    const list = variantsByCard.get(variant.cardId) ?? [];
    list.push(variant);
    variantsByCard.set(variant.cardId, list);
  }

  const byVariant = new Map<string, PricePoint[]>();
  for (const point of history) {
    const list = byVariant.get(point.variantId) ?? [];
    list.push(point);
    byVariant.set(point.variantId, list);
  }

  const latestNm = new Map<string, PricePoint>();
  const weekAgoNm = new Map<string, number>();
  for (const [variantId, points] of byVariant) {
    points.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    latestNm.set(variantId, points[points.length - 1]);
    weekAgoNm.set(variantId, points[Math.max(0, points.length - 8)].priceThb);
  }

  return {
    sets,
    cards,
    variants,
    history,
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
  loaded = await loadOverrides();
});

/** สร้างดัชนีใหม่เฉพาะเมื่อข้อมูลที่โหลดมาเปลี่ยนจริง */
function snap(): Snapshot {
  if (cachedSnapshot && cachedKey === loaded.key) return cachedSnapshot;

  cachedSnapshot = build(loaded.overrides);
  cachedKey = loaded.key;
  return cachedSnapshot;
}

async function commit(mutate: (draft: Overrides) => void): Promise<boolean> {
  // อ่านของล่าสุดก่อนเขียนเสมอ ไม่ใช้สำเนาที่ค้างอยู่ในหน่วยความจำ
  // เพราะ instance อื่นอาจเพิ่งบันทึกอะไรไปแล้ว
  const { overrides: current } = await loadOverrides();
  const draft: Overrides = {
    ...current,
    sets: [...current.sets],
    cards: [...current.cards],
    variants: [...current.variants],
    cardEdits: { ...current.cardEdits },
    deletedSetCodes: [...current.deletedSetCodes],
    deletedCardIds: [...current.deletedCardIds],
    pricePoints: [...current.pricePoints],
    version: current.version + 1,
  };

  mutate(draft);

  const saved = await saveOverrides(draft);
  if (!saved) return false;

  loaded = saved;
  cachedSnapshot = build(saved.overrides);
  cachedKey = saved.key;
  return true;
}

function currentPrice(variantId: string, condition: Condition): PriceCurrent | null {
  const { latestNm, weekAgoNm } = snap();
  const latest = latestNm.get(variantId);
  if (!latest) return null;

  const nm = latest.priceThb;
  const before = weekAgoNm.get(variantId) ?? nm;
  const change7d = before > 0 ? ((nm - before) / before) * 100 : null;

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

export function listSets(gameSlug: string): CardSet[] {
  return snap()
    .sets.filter((s) => s.gameSlug === gameSlug)
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
}

export function listAllSets(): CardSet[] {
  return [...snap().sets].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
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

export function getHistory(variantId: string, days = HISTORY_DAYS): PricePoint[] {
  return snap()
    .history.filter((p) => p.variantId === variantId)
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

export interface AdminPriceRow {
  card: Card;
  variant: Variant;
  current: PriceCurrent | null;
  /** ราคาใบเกรด PSA 10 ของ variant เดียวกัน คำนวณจากราคาดิบ */
  psa: PriceCurrent | null;
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
        const psa = currentPrice(variant.id, "PSA10");
        const staleDays = current
          ? Math.floor((now - new Date(current.updatedAt).getTime()) / 86400000)
          : null;
        return { card, variant, current, psa, staleDays };
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
): Promise<PriceCurrent | null> {
  if (!snap().variantById.has(variantId)) return null;
  if (!Number.isFinite(priceThb) || priceThb <= 0) return null;

  // ราคาที่กรอกอิงสภาพใดก็ได้ แต่เก็บเป็นฐาน NM เพื่อให้เทียบกันได้ทั้งระบบ
  const nmEquivalent =
    condition === "PSA10"
      ? psa10ToNm(priceThb, variantId)
      : Math.round(priceThb / CONDITION_MULTIPLIER[condition]);
  if (nmEquivalent <= 0) return null;

  const ok = await commit((draft) => {
    draft.pricePoints.push({
      variantId,
      condition: "NM",
      priceThb: nmEquivalent,
      recordedAt: new Date().toISOString(),
    });
  });

  if (!ok) return null;
  return currentPrice(variantId, condition);
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

  if (!await commit((draft) => draft.sets.push(set))) {
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

  const ok = await commit((draft) => {
    if (!draft.deletedSetCodes.includes(code)) draft.deletedSetCodes.push(code);
    // ชุดที่เพิ่งสร้างเองในแดชบอร์ดให้เอาออกจากรายการที่เพิ่มด้วย
    // ไม่งั้นไฟล์ส่วนต่างจะบวมขึ้นเรื่อย ๆ ด้วยชุดที่ทั้งเพิ่มและลบ
    draft.sets = draft.sets.filter((s) => s.code !== code);
  });

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
}

export async function createCard(input: NewCardInput): Promise<Result<Card>> {
  const state = snap();
  const number = input.number.trim().toUpperCase();

  if (!state.setByCode.has(input.setCode)) return { ok: false, error: "ไม่พบชุดนี้" };
  if (!number) return { ok: false, error: "ต้องระบุเลขการ์ด" };
  if (!input.nameTh.trim()) return { ok: false, error: "ต้องระบุชื่อการ์ดภาษาไทย" };
  if (state.cardById.has(number)) return { ok: false, error: `มีการ์ดเลข ${number} อยู่แล้ว` };

  const nameEn = input.nameEn.trim() || input.nameTh.trim();
  const card: Card = {
    id: number,
    slug: `${slugify(number)}-${slugify(nameEn)}`,
    setCode: input.setCode,
    number,
    nameTh: input.nameTh.trim(),
    nameEn,
    rarity: input.rarity.trim() || "C",
    cardType: input.cardType.trim() || "Character",
    color: input.color.trim() || "ไม่ระบุ",
  };

  // slug คือ URL ถาวร ห้ามชนกัน
  if (state.cardBySlug.has(card.slug)) card.slug = `${card.slug}-${slugify(input.setCode)}`;

  const types: VariantType[] = [...input.variantTypes];
  if (!types.includes("normal")) types.unshift("normal");

  const ok = await commit((draft) => {
    draft.cards.push(card);
    for (const variantType of types) {
      draft.variants.push({
        id: `${number}:${variantType}`,
        cardId: number,
        variantType,
        isFoil: variantType !== "normal",
      });
    }
    if (input.priceThb && input.priceThb > 0) {
      // ตั้งราคาให้ variant ปกติ ส่วนตัวพิเศษให้ไปกรอกในหน้าอัปเดตราคา
      draft.pricePoints.push({
        variantId: `${number}:normal`,
        condition: "NM",
        priceThb: Math.round(input.priceThb),
        recordedAt: new Date().toISOString(),
      });
    }
  });

  if (!ok) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: card };
}

export async function updateCard(
  id: string,
  patch: Partial<Pick<Card, "nameTh" | "nameEn" | "rarity" | "cardType" | "color">>,
): Promise<Result<Card>> {
  const card = snap().cardById.get(id);
  if (!card) return { ok: false, error: "ไม่พบการ์ดนี้" };
  if (patch.nameTh !== undefined && !patch.nameTh.trim()) {
    return { ok: false, error: "ชื่อการ์ดภาษาไทยว่างไม่ได้" };
  }

  const clean: Partial<Card> = {};
  if (patch.nameTh?.trim()) clean.nameTh = patch.nameTh.trim();
  if (patch.nameEn?.trim()) clean.nameEn = patch.nameEn.trim();
  if (patch.rarity?.trim()) clean.rarity = patch.rarity.trim();
  if (patch.cardType?.trim()) clean.cardType = patch.cardType.trim();
  if (patch.color?.trim()) clean.color = patch.color.trim();

  const ok = await commit((draft) => {
    draft.cardEdits[id] = { ...draft.cardEdits[id], ...clean };
  });

  if (!ok) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: { ...card, ...clean } };
}

export async function deleteCard(id: string): Promise<Result<true>> {
  if (!snap().cardById.has(id)) return { ok: false, error: "ไม่พบการ์ดนี้" };

  const ok = await commit((draft) => {
    if (!draft.deletedCardIds.includes(id)) draft.deletedCardIds.push(id);
  });

  if (!ok) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: true };
}
