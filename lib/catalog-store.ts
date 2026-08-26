import { db, usingSupabase } from "./db";
import {
  EMPTY_OVERRIDES,
  isStorageWritable,
  loadOverrides,
  saveOverrides,
  usingBlob,
  type LoadedOverrides,
  type Overrides,
} from "./overrides";
import type { Card, CardSet, PricePoint, Variant } from "./types";

/**
 * ที่เก็บ "ส่วนต่าง" ของแคตตาล็อก — มีสองหลังบ้านที่สลับกันได้
 *
 * supabase : ตารางจริงใน Postgres (ใช้เมื่อมี SUPABASE_URL + SERVICE_ROLE_KEY)
 * document : ก้อน JSON ก้อนเดียวใน Vercel Blob หรือไฟล์ในเครื่อง (ของเดิม)
 *
 * ทั้งสองแบบ "อ่าน" ออกมาเป็นรูปเดียวกันเป๊ะ (Overrides) ชั้นอ่านของ repo.ts
 * จึงไม่รู้เลยว่าข้อมูลมาจากไหน ต่างกันแค่ตอนเขียน:
 *
 * - แบบ document เขียนทีต้องเขียนทั้งก้อน เพราะเป็นไฟล์เดียว
 * - แบบ supabase เขียนเฉพาะแถวที่เปลี่ยน ซึ่งสำคัญมากกับตารางราคาที่โตไม่หยุด
 *   (บันทึกราคาหนึ่งครั้งไม่ควรต้องเขียนราคาทั้งหมดที่เคยมีใหม่ทั้งชุด)
 *
 * ทุกเมธอดที่เขียนคืน "สถานะล่าสุดหลังเขียน" กลับไป ไม่ใช่แค่สำเร็จ/ไม่สำเร็จ
 * เพราะ repo ต้องใช้สร้างดัชนีใหม่ทันทีในคำขอเดียวกัน เช่น บันทึกราคาเสร็จแล้ว
 * ต้องอ่านราคาที่เพิ่งบันทึกกลับมาแสดงได้เลย
 */

/** null = บันทึกไม่สำเร็จ */
export type WriteResult = LoadedOverrides | null;

export interface CatalogStore {
  kind: "supabase" | "blob" | "file" | "none";
  load(): Promise<LoadedOverrides>;
  writable(): boolean;
  setFeatured(ids: string[]): Promise<WriteResult>;
  addPricePoints(points: PricePoint[]): Promise<WriteResult>;
  addSet(set: CardSet): Promise<WriteResult>;
  removeSet(code: string): Promise<WriteResult>;
  addCards(cards: Card[], variants: Variant[], points: PricePoint[]): Promise<WriteResult>;
  editCard(id: string, patch: Partial<Card>): Promise<WriteResult>;
  /** เหมือน editCard แต่ทำหลายใบในคำขอเดียว — ใช้ตอนซิงก์ราคาเป็นล็อต กัน
   * โหลดแคตตาล็อกทั้งก้อนใหม่ซ้ำต่อใบจนงานล็อตใหญ่ช้าจนหมดเวลา */
  markCardsChecked(cardIds: string[], checkedAt: string): Promise<WriteResult>;
  removeCard(id: string): Promise<WriteResult>;
}

// ---------------- หลังบ้านแบบไฟล์เดียว (Vercel Blob / ไฟล์ในเครื่อง) ----------------

/** อ่านของล่าสุดก่อนเขียนเสมอ — instance อื่นอาจเพิ่งบันทึกอะไรไปแล้ว */
async function commitDocument(mutate: (draft: Overrides) => void): Promise<WriteResult> {
  const { overrides: current } = await loadOverrides();

  const draft: Overrides = {
    ...current,
    sets: [...current.sets],
    cards: [...current.cards],
    variants: [...current.variants],
    cardEdits: { ...current.cardEdits },
    deletedSetCodes: [...current.deletedSetCodes],
    featuredCardIds: [...current.featuredCardIds],
    deletedCardIds: [...current.deletedCardIds],
    pricePoints: [...current.pricePoints],
    version: current.version + 1,
  };

  mutate(draft);
  return saveOverrides(draft);
}

const documentStore: CatalogStore = {
  kind: usingBlob() ? "blob" : isStorageWritable() ? "file" : "none",
  load: loadOverrides,
  writable: isStorageWritable,

  setFeatured: (ids) => commitDocument((draft) => void (draft.featuredCardIds = ids)),

  addPricePoints: (points) =>
    commitDocument((draft) => void draft.pricePoints.push(...points)),

  addSet: (set) => commitDocument((draft) => void draft.sets.push(set)),

  removeSet: (code) =>
    commitDocument((draft) => {
      if (!draft.deletedSetCodes.includes(code)) draft.deletedSetCodes.push(code);
      // ชุดที่เพิ่งสร้างเองแล้วลบ ให้เอาออกจากรายการที่เพิ่มด้วย
      // ไม่งั้นก้อนข้อมูลจะบวมขึ้นเรื่อย ๆ ด้วยชุดที่ทั้งเพิ่มและลบ
      draft.sets = draft.sets.filter((s) => s.code !== code);
    }),

  addCards: (cards, variants, points) =>
    commitDocument((draft) => {
      draft.cards.push(...cards);
      draft.variants.push(...variants);
      draft.pricePoints.push(...points);
    }),

  editCard: (id, patch) =>
    commitDocument((draft) => void (draft.cardEdits[id] = { ...draft.cardEdits[id], ...patch })),

  markCardsChecked: (cardIds, checkedAt) =>
    commitDocument((draft) => {
      for (const id of cardIds) {
        draft.cardEdits[id] = { ...draft.cardEdits[id], snkrdunkCheckedAt: checkedAt };
      }
    }),

  removeCard: (id) =>
    commitDocument((draft) => {
      if (!draft.deletedCardIds.includes(id)) draft.deletedCardIds.push(id);
    }),
};

// ---------------- หลังบ้านแบบ Supabase ----------------

interface SetRow {
  code: string;
  game_slug: string;
  name_th: string;
  name_en: string;
  language: string;
  release_date: string;
  total_cards: number;
}

interface CardRow {
  id: string;
  slug: string;
  set_code: string;
  number: string;
  name_th: string;
  name_en: string;
  rarity: string;
  card_type: string;
  color: string;
  variant_type: string;
}

interface VariantRow {
  id: string;
  card_id: string;
  variant_type: string;
  is_foil: boolean;
}

interface PriceRow {
  id: number;
  variant_id: string;
  condition: string;
  price_thb: number;
  source: string;
  recorded_at: string;
}

function toSetRow(set: CardSet): SetRow {
  return {
    code: set.code,
    game_slug: set.gameSlug,
    name_th: set.nameTh,
    name_en: set.nameEn,
    language: set.language,
    release_date: set.releaseDate,
    total_cards: set.totalCards,
  };
}

function toCardRow(card: Card): CardRow {
  return {
    id: card.id,
    slug: card.slug,
    set_code: card.setCode,
    number: card.number,
    name_th: card.nameTh,
    name_en: card.nameEn,
    rarity: card.rarity,
    card_type: card.cardType,
    color: card.color,
    variant_type: card.variantType,
  };
}

function toPriceRow(point: PricePoint) {
  return {
    variant_id: point.variantId,
    condition: point.condition,
    price_thb: point.priceThb,
    source: point.source ?? "market",
    recorded_at: point.recordedAt,
  };
}

/** PostgREST คืนมาสูงสุดแค่ 1,000 แถวต่อคำขอเสมอ (ตั้งค่า max-rows ของ Supabase
 * เอง ไม่ใช่ limit ที่เราสั่ง) เงียบด้วย ไม่ error แค่ตัดที่เหลือทิ้ง — ตารางไหน
 * โตเกิน 1,000 แถวจะเจอบั๊กแบบเขียนสำเร็จแต่อ่านไม่เห็นข้อมูลส่วนที่เกิน
 * ต้องวนหน้าด้วย .range() เอง ต้องมี order() มาก่อนเสมอเพื่อให้ลำดับแถวคงที่
 * ระหว่างวนหน้า ไม่งั้นมีสิทธิ์ข้ามหรือได้ซ้ำ */
const PAGE_SIZE = 1000;

async function selectAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: unknown }> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) return { data: all, error };
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return { data: all, error: null };
    from += PAGE_SIZE;
  }
}

async function loadFromSupabase(): Promise<LoadedOverrides> {
  const client = db();
  if (!client) return { overrides: EMPTY_OVERRIDES, key: "empty" };

  try {
    // ยิงพร้อมกันทั้งหมด เพราะไม่มีตารางไหนต้องรอผลของอีกตาราง — แต่ละตารางเอง
    // วนหน้าเรื่อย ๆ ข้างในจนกว่าจะได้ครบ (ดู selectAll ด้านบน)
    const [sets, cards, variants, edits, deletedSets, deletedCards, featured, prices] =
      await Promise.all([
        selectAll((from, to) => client.from("admin_sets").select("*").order("code").range(from, to)),
        selectAll((from, to) => client.from("admin_cards").select("*").order("id").range(from, to)),
        selectAll((from, to) =>
          client.from("admin_variants").select("*").order("id").range(from, to),
        ),
        selectAll((from, to) =>
          client.from("card_edits").select("card_id, patch, updated_at").order("card_id").range(from, to),
        ),
        selectAll((from, to) => client.from("deleted_sets").select("code").order("code").range(from, to)),
        selectAll((from, to) =>
          client.from("deleted_cards").select("card_id").order("card_id").range(from, to),
        ),
        selectAll((from, to) =>
          client.from("featured_cards").select("card_id, position").order("position").range(from, to),
        ),
        selectAll((from, to) =>
          client
            .from("price_points")
            .select("id, variant_id, condition, price_thb, source, recorded_at")
            .order("recorded_at")
            .order("id")
            .range(from, to),
        ),
      ]);

    const failed = [sets, cards, variants, edits, deletedSets, deletedCards, featured, prices].find(
      (result) => result.error,
    );
    if (failed?.error) throw failed.error;

    const cardEdits: Record<string, Partial<Card>> = {};
    for (const row of (edits.data ?? []) as { card_id: string; patch: Partial<Card> }[]) {
      cardEdits[row.card_id] = row.patch ?? {};
    }

    const overrides: Overrides = {
      sets: ((sets.data ?? []) as SetRow[]).map((row) => ({
        code: row.code,
        gameSlug: row.game_slug,
        nameTh: row.name_th,
        nameEn: row.name_en,
        language: row.language as CardSet["language"],
        releaseDate: row.release_date,
        totalCards: row.total_cards,
      })),
      cards: ((cards.data ?? []) as CardRow[]).map((row) => ({
        id: row.id,
        slug: row.slug,
        setCode: row.set_code,
        number: row.number,
        nameTh: row.name_th,
        nameEn: row.name_en,
        rarity: row.rarity,
        cardType: row.card_type,
        color: row.color,
        variantType: row.variant_type as Card["variantType"],
      })),
      variants: ((variants.data ?? []) as VariantRow[]).map((row) => ({
        id: row.id,
        cardId: row.card_id,
        variantType: row.variant_type as Variant["variantType"],
        isFoil: row.is_foil,
      })),
      cardEdits,
      deletedSetCodes: ((deletedSets.data ?? []) as { code: string }[]).map((row) => row.code),
      deletedCardIds: ((deletedCards.data ?? []) as { card_id: string }[]).map(
        (row) => row.card_id,
      ),
      featuredCardIds: ((featured.data ?? []) as { card_id: string }[]).map((row) => row.card_id),
      pricePoints: ((prices.data ?? []) as PriceRow[]).map((row) => ({
        variantId: row.variant_id,
        condition: row.condition as PricePoint["condition"],
        priceThb: row.price_thb,
        recordedAt: row.recorded_at,
        source: row.source as PricePoint["source"],
      })),
      version: 0,
    };

    return { overrides, key: keyOf(overrides, edits.data ?? [], prices.data ?? []) };
  } catch {
    // อ่านไม่ได้ — ใช้ข้อมูลตั้งต้นดีกว่าพังทั้งเว็บ เหมือนที่หลังบ้านแบบไฟล์ทำ
    return { overrides: EMPTY_OVERRIDES, key: "error" };
  }
}

/**
 * กุญแจบอกรุ่นของข้อมูล ใช้ให้ repo รู้ว่าต้องสร้างดัชนีใหม่ไหม
 *
 * ประกอบจากค่าที่ "ต้องเปลี่ยน" เมื่อมีการเขียนเกิดขึ้นจริงเท่านั้น:
 * จำนวนแถวของทุกตาราง + id ของราคาล่าสุด + เวลาแก้ล่าสุดของ card_edits
 * (การแก้การ์ดใบเดิมซ้ำไม่ทำให้จำนวนแถวเปลี่ยน แต่ updated_at เปลี่ยนเสมอ)
 */
function keyOf(
  overrides: Overrides,
  edits: { updated_at?: string }[],
  prices: { id?: number }[],
): string {
  const latestEdit = edits.reduce((max, row) => (row.updated_at ?? "") > max ? row.updated_at! : max, "");
  const latestPrice = prices.reduce((max, row) => Math.max(max, row.id ?? 0), 0);

  return [
    overrides.sets.length,
    overrides.cards.length,
    overrides.variants.length,
    Object.keys(overrides.cardEdits).length,
    overrides.deletedSetCodes.length,
    overrides.deletedCardIds.length,
    overrides.featuredCardIds.join(","),
    overrides.pricePoints.length,
    latestPrice,
    latestEdit,
  ].join("|");
}

/** ทำงานเขียนแล้วอ่านสถานะใหม่กลับมา — คืน null เมื่อมีขั้นไหนพลาด */
async function commitSupabase(work: () => Promise<unknown>): Promise<WriteResult> {
  try {
    await work();
    return await loadFromSupabase();
  } catch (err) {
    console.error("commitSupabase ล้มเหลว:", err);
    return null;
  }
}

/** โยน error เมื่อ Supabase ตอบว่าไม่สำเร็จ ให้ commitSupabase จับได้ที่เดียว */
function check(result: { error: unknown }): void {
  if (result.error) throw result.error;
}

const supabaseStore: CatalogStore = {
  kind: "supabase",
  load: loadFromSupabase,
  writable: () => true,

  setFeatured: (ids) =>
    commitSupabase(async () => {
      const client = db()!;
      // ปักหมุดใหม่ทั้งชุดเสมอ เพราะลำดับสำคัญและรายการมีไม่กี่ใบ
      check(await client.from("featured_cards").delete().neq("card_id", ""));
      if (ids.length > 0) {
        check(
          await client
            .from("featured_cards")
            .insert(ids.map((card_id, position) => ({ card_id, position }))),
        );
      }
    }),

  addPricePoints: (points) =>
    commitSupabase(async () => {
      if (points.length === 0) return;
      check(await db()!.from("price_points").insert(points.map(toPriceRow)));
    }),

  addSet: (set) =>
    commitSupabase(async () => {
      const client = db()!;
      check(await client.from("admin_sets").insert(toSetRow(set)));
      // สร้างชุดรหัสเดิมที่เคยลบไป = ปลดเครื่องหมายลบออก ไม่งั้นชุดใหม่จะหายทันที
      check(await client.from("deleted_sets").delete().eq("code", set.code));
    }),

  removeSet: (code) =>
    commitSupabase(async () => {
      const client = db()!;
      check(await client.from("deleted_sets").upsert({ code }));
      check(await client.from("admin_sets").delete().eq("code", code));
    }),

  addCards: (cards, variants, points) =>
    commitSupabase(async () => {
      const client = db()!;
      check(await client.from("admin_cards").insert(cards.map(toCardRow)));
      check(
        await client.from("admin_variants").insert(
          variants.map((variant) => ({
            id: variant.id,
            card_id: variant.cardId,
            variant_type: variant.variantType,
            is_foil: variant.isFoil,
          })),
        ),
      );
      if (points.length > 0) {
        check(await client.from("price_points").insert(points.map(toPriceRow)));
      }
      check(
        await client
          .from("deleted_cards")
          .delete()
          .in("card_id", cards.map((card) => card.id)),
      );
    }),

  editCard: (id, patch) =>
    commitSupabase(async () => {
      const client = db()!;
      // อ่าน patch เดิมมารวมก่อน เพราะแต่ละครั้งแก้ทีละไม่กี่ช่อง
      // ถ้าเขียนทับทั้งก้อนจะลบช่องที่แก้ไว้รอบก่อนทิ้งไปด้วย
      const existing = await client
        .from("card_edits")
        .select("patch")
        .eq("card_id", id)
        .maybeSingle();
      check(existing);

      const merged = { ...((existing.data?.patch as Partial<Card>) ?? {}), ...patch };
      check(
        await client
          .from("card_edits")
          .upsert({ card_id: id, patch: merged, updated_at: new Date().toISOString() }),
      );
    }),

  markCardsChecked: (cardIds, checkedAt) =>
    commitSupabase(async () => {
      if (cardIds.length === 0) return;
      const client = db()!;
      // ต้องอ่าน patch เดิมของทุกใบมารวมก่อนเหมือน editCard — แต่ทำครั้งเดียว
      // ทั้งล็อตแทนที่จะวนอ่าน-เขียนทีละใบ (ซึ่งทำให้แคตตาล็อกทั้งก้อนโดนโหลด
      // ใหม่ต่อใบจนงานล็อตใหญ่ช้าจนหมดเวลาฟังก์ชัน)
      const existing = await selectAll<{ card_id: string; patch: Partial<Card> }>((from, to) =>
        client.from("card_edits").select("card_id, patch").in("card_id", cardIds).range(from, to),
      );
      check(existing);

      const existingByCardId = new Map(existing.data.map((row) => [row.card_id, row.patch ?? {}]));
      const rows = cardIds.map((id) => ({
        card_id: id,
        patch: { ...existingByCardId.get(id), snkrdunkCheckedAt: checkedAt },
        updated_at: new Date().toISOString(),
      }));
      check(await client.from("card_edits").upsert(rows));
    }),

  removeCard: (id) =>
    commitSupabase(async () => {
      const client = db()!;
      check(await client.from("deleted_cards").upsert({ card_id: id }));
    }),
};

export const catalogStore: CatalogStore = usingSupabase() ? supabaseStore : documentStore;
