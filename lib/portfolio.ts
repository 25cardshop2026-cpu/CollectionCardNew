import { db, usingSupabase } from "./db";
import { isWritable, readJson, writeJson } from "./store";
import type { Result } from "./users";
import type { Condition } from "./types";

/**
 * พอร์ตการ์ดของผู้ใช้แต่ละคน
 *
 * ต่อ Supabase แล้วเก็บในตาราง portfolio_holdings แถวละหนึ่งรายการ
 * ยังไม่ต่อก็ถอยไปเก็บแยกไฟล์ต่อคน (portfolios/<id>.json) เหมือนเดิม
 *
 * เก็บเฉพาะ "มีอะไรกี่ใบ ซื้อมาเท่าไหร่" ส่วนมูลค่าปัจจุบันคำนวณสดจากราคาใน
 * แคตตาล็อกทุกครั้งที่เปิดหน้า จะได้ไม่มีตัวเลขค้างที่ไม่ตรงกับราคาจริง
 */

export interface Holding {
  id: string;
  /** id ของการ์ด = "เลขการ์ด:แบบพิมพ์" ซึ่งเป็น id เดียวกับที่ราคาอ้างอิง */
  cardId: string;
  condition: Condition;
  quantity: number;
  /** ราคาที่ซื้อมาต่อใบ — ไม่กรอกก็ได้ แค่จะคิดกำไรขาดทุนให้ไม่ได้ */
  costThb: number | null;
  note?: string;
  addedAt: string;
}

const NOT_WRITABLE = "บันทึกไม่สำเร็จ — ที่เก็บข้อมูลไม่ตอบสนอง ลองใหม่อีกครั้ง";

function keyFor(userId: string): string {
  return `portfolios/${userId}.json`;
}

function storageWritable(): boolean {
  return usingSupabase() || isWritable();
}

interface HoldingRow {
  id: string;
  card_id: string;
  condition: string;
  quantity: number;
  cost_thb: number | null;
  note: string | null;
  added_at: string;
}

function fromRow(row: HoldingRow): Holding {
  return {
    id: row.id,
    cardId: row.card_id,
    condition: row.condition as Condition,
    quantity: row.quantity,
    costThb: row.cost_thb,
    ...(row.note ? { note: row.note } : {}),
    addedAt: row.added_at,
  };
}

export async function listHoldings(userId: string): Promise<Holding[]> {
  const client = db();
  if (client) {
    const { data } = await client
      .from("portfolio_holdings")
      .select("id, card_id, condition, quantity, cost_thb, note, added_at")
      .eq("user_id", userId)
      .order("added_at");
    return ((data ?? []) as HoldingRow[]).map(fromRow);
  }

  const data = await readJson<Holding[]>(keyFor(userId), []);
  return Array.isArray(data) ? data : [];
}

export interface HoldingInput {
  cardId: string;
  condition: Condition;
  quantity: number;
  costThb: number | null;
  note?: string;
}

function validate(input: HoldingInput): string | null {
  if (!input.cardId) return "ต้องระบุการ์ด";
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return "จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 1 ใบขึ้นไป";
  }
  if (input.quantity > 9999) return "จำนวนมากเกินไป";
  if (input.costThb !== null && (!Number.isFinite(input.costThb) || input.costThb < 0)) {
    return "ราคาที่ซื้อมาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป หรือเว้นว่างไว้";
  }
  return null;
}

/**
 * เพิ่มการ์ดเข้าพอร์ต
 *
 * การ์ดใบเดียวกันสภาพเดียวกันที่ซื้อมาคนละราคา ถือเป็นคนละแถว ไม่ยุบรวมกัน
 * เพราะต้นทุนต่อใบคือสิ่งที่คนสะสมอยากเห็นแยกกันตอนคิดกำไรขาดทุน
 */
export async function addHolding(
  userId: string,
  input: HoldingInput,
): Promise<Result<Holding>> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };
  if (!storageWritable()) return { ok: false, error: NOT_WRITABLE };

  const holding: Holding = {
    id: crypto.randomUUID(),
    cardId: input.cardId,
    condition: input.condition,
    quantity: input.quantity,
    costThb: input.costThb,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    addedAt: new Date().toISOString(),
  };

  const client = db();
  if (client) {
    const { error } = await client.from("portfolio_holdings").insert({
      id: holding.id,
      user_id: userId,
      card_id: holding.cardId,
      condition: holding.condition,
      quantity: holding.quantity,
      cost_thb: holding.costThb,
      note: holding.note ?? null,
      added_at: holding.addedAt,
    });
    return error ? { ok: false, error: NOT_WRITABLE } : { ok: true, value: holding };
  }

  const current = await listHoldings(userId);
  if (!(await writeJson(keyFor(userId), [...current, holding]))) {
    return { ok: false, error: NOT_WRITABLE };
  }
  return { ok: true, value: holding };
}

export async function updateHolding(
  userId: string,
  holdingId: string,
  patch: Pick<HoldingInput, "quantity" | "costThb">,
): Promise<Result<true>> {
  if (!storageWritable()) return { ok: false, error: NOT_WRITABLE };

  const client = db();
  if (client) {
    // ผูก user_id ไว้ในเงื่อนไขด้วยเสมอ ไม่ใช่แค่ id ของรายการ
    // ไม่งั้นคนที่เดา id ถูกจะแก้พอร์ตของคนอื่นได้
    const { data, error } = await client
      .from("portfolio_holdings")
      .update({ quantity: patch.quantity, cost_thb: patch.costThb })
      .eq("id", holdingId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      // ค่าที่ผิดกติกาถูกดักด้วย CHECK ของตาราง จึงบอกให้ตรงว่าแก้อะไร
      const invalid = validate({ cardId: "x", condition: "NM", ...patch });
      return { ok: false, error: invalid ?? NOT_WRITABLE };
    }
    return data ? { ok: true, value: true } : { ok: false, error: "ไม่พบรายการนี้ในพอร์ต" };
  }

  const current = await listHoldings(userId);
  const index = current.findIndex((h) => h.id === holdingId);
  if (index < 0) return { ok: false, error: "ไม่พบรายการนี้ในพอร์ต" };

  const invalid = validate({ ...current[index], ...patch });
  if (invalid) return { ok: false, error: invalid };

  const next = [...current];
  next[index] = { ...next[index], ...patch };

  if (!(await writeJson(keyFor(userId), next))) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: true };
}

export async function removeHolding(
  userId: string,
  holdingId: string,
): Promise<Result<true>> {
  if (!storageWritable()) return { ok: false, error: NOT_WRITABLE };

  const client = db();
  if (client) {
    const { data, error } = await client
      .from("portfolio_holdings")
      .delete()
      .eq("id", holdingId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, error: NOT_WRITABLE };
    return data ? { ok: true, value: true } : { ok: false, error: "ไม่พบรายการนี้ในพอร์ต" };
  }

  const current = await listHoldings(userId);
  if (!current.some((h) => h.id === holdingId)) {
    return { ok: false, error: "ไม่พบรายการนี้ในพอร์ต" };
  }

  const next = current.filter((h) => h.id !== holdingId);
  if (!(await writeJson(keyFor(userId), next))) return { ok: false, error: NOT_WRITABLE };
  return { ok: true, value: true };
}
