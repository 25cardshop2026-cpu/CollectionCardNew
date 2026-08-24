/**
 * ย้ายข้อมูลจาก Vercel Blob เข้า Supabase
 *
 *   node scripts/migrate-to-supabase.mjs            ดูก่อนว่าจะย้ายอะไรบ้าง
 *   node scripts/migrate-to-supabase.mjs --write    ย้ายจริง
 *
 * อ่านค่าจาก .env.local ต้องมีครบสามตัว:
 *   BLOB_READ_WRITE_TOKEN (ต้นทาง) · SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 *
 * ไม่ลบอะไรที่ต้นทางเลย ของเดิมใน Blob ยังอยู่ครบหลังย้ายเสร็จ ถ้าผลลัพธ์
 * ไม่เข้าท่าก็แค่ถอด SUPABASE_* ออกแล้วแอปจะกลับไปใช้ Blob เหมือนเดิม
 *
 * กันการรันซ้ำโดยดูว่าปลายทางมีข้อมูลอยู่แล้วหรือยัง เพราะตารางราคาไม่มี
 * คีย์ธรรมชาติให้ upsert ได้ รันซ้ำโดยไม่ระวังจะได้ประวัติราคาซ้ำสองชุด
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { get, list } from "@vercel/blob";

// ---------- ตั้งค่า ----------

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const WRITE = process.argv.includes("--write");
const token = process.env.BLOB_READ_WRITE_TOKEN;
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!token) exit("ไม่มี BLOB_READ_WRITE_TOKEN ใน .env.local — ไม่รู้จะอ่านของเก่าจากไหน");
if (!url || !key) exit("ต้องมี SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local ก่อน");

const db = createClient(url, key, { auth: { persistSession: false } });

function exit(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** อ่านไฟล์ JSON หนึ่งก้อนจาก Blob — ไม่มีก็คืนค่าตั้งต้น */
async function readBlob(pathname, fallback) {
  try {
    const result = await get(pathname, { access: "private", useCache: false, token });
    if (!result) return fallback;
    return JSON.parse(await new Response(result.stream).text());
  } catch {
    return fallback;
  }
}

function check(step, { error }) {
  if (error) exit(`${step} ล้มเหลว: ${error.message ?? JSON.stringify(error)}`);
}

// ---------- อ่านของเก่าทั้งหมด ----------

console.log("อ่านข้อมูลจาก Vercel Blob…");

const overrides = await readBlob("overrides.json", {});
const users = (await readBlob("users.json", [])) ?? [];
const resets = (await readBlob("password-resets.json", [])) ?? [];

const { blobs } = await list({ token });
const portfolioBlobs = blobs.filter((b) => b.pathname.startsWith("portfolios/"));
const imageBlobs = blobs.filter((b) => b.pathname.startsWith("cards/"));

const portfolios = [];
for (const blob of portfolioBlobs) {
  const userId = path.basename(blob.pathname, ".json");
  const holdings = (await readBlob(blob.pathname, [])) ?? [];
  for (const holding of holdings) portfolios.push({ userId, holding });
}

const counts = {
  "ชุดที่เพิ่มเอง": (overrides.sets ?? []).length,
  "การ์ดที่เพิ่มเอง": (overrides.cards ?? []).length,
  เวอร์ชัน: (overrides.variants ?? []).length,
  การ์ดที่แก้: Object.keys(overrides.cardEdits ?? {}).length,
  ชุดที่ลบ: (overrides.deletedSetCodes ?? []).length,
  การ์ดที่ลบ: (overrides.deletedCardIds ?? []).length,
  การ์ดปักหมุด: (overrides.featuredCardIds ?? []).length,
  ราคา: (overrides.pricePoints ?? []).length,
  ผู้ใช้: users.length,
  รายการในพอร์ต: portfolios.length,
  คำขอตั้งรหัสใหม่: resets.length,
  รูปการ์ด: imageBlobs.length,
};

console.log("\nจะย้ายทั้งหมด:");
for (const [label, n] of Object.entries(counts)) console.log(`  ${label.padEnd(18)} ${n}`);

if (!WRITE) {
  console.log("\nนี่คือการดูเฉย ๆ ยังไม่ได้เขียนอะไร — ใส่ --write เพื่อย้ายจริง\n");
  process.exit(0);
}

// ---------- กันการรันซ้ำ ----------

const existing = await db.from("price_points").select("id", { count: "exact", head: true });
check("ต่อ Supabase", existing);

if ((existing.count ?? 0) > 0) {
  exit(
    `ตาราง price_points มีข้อมูลอยู่แล้ว ${existing.count} แถว — หยุดไว้ก่อน\n` +
      "  ถ้าตั้งใจจะเริ่มใหม่ ให้ล้างตารางใน Supabase ก่อนแล้วค่อยรันอีกครั้ง",
  );
}

// ---------- เขียนเข้า Supabase ----------

console.log("\nเขียนเข้า Supabase…");

const sets = (overrides.sets ?? []).map((s) => ({
  code: s.code,
  game_slug: s.gameSlug,
  name_th: s.nameTh,
  name_en: s.nameEn,
  language: s.language,
  release_date: s.releaseDate,
  total_cards: s.totalCards ?? 0,
}));
if (sets.length) check("ย้ายชุด", await db.from("admin_sets").upsert(sets));

const cards = (overrides.cards ?? []).map((c) => ({
  id: c.id,
  slug: c.slug,
  set_code: c.setCode,
  number: c.number,
  name_th: c.nameTh,
  name_en: c.nameEn,
  rarity: c.rarity,
  card_type: c.cardType,
  color: c.color,
  variant_type: c.variantType ?? "normal",
}));
if (cards.length) check("ย้ายการ์ด", await db.from("admin_cards").upsert(cards));

const variants = (overrides.variants ?? []).map((v) => ({
  id: v.id,
  card_id: v.cardId,
  variant_type: v.variantType,
  is_foil: Boolean(v.isFoil),
}));
if (variants.length) check("ย้ายเวอร์ชัน", await db.from("admin_variants").upsert(variants));

const edits = Object.entries(overrides.cardEdits ?? {}).map(([card_id, patch]) => ({
  card_id,
  patch,
}));
if (edits.length) check("ย้ายการแก้ไขการ์ด", await db.from("card_edits").upsert(edits));

const deletedSets = (overrides.deletedSetCodes ?? []).map((code) => ({ code }));
if (deletedSets.length) check("ย้ายชุดที่ลบ", await db.from("deleted_sets").upsert(deletedSets));

const deletedCards = (overrides.deletedCardIds ?? []).map((card_id) => ({ card_id }));
if (deletedCards.length) {
  check("ย้ายการ์ดที่ลบ", await db.from("deleted_cards").upsert(deletedCards));
}

const featured = (overrides.featuredCardIds ?? []).map((card_id, position) => ({
  card_id,
  position,
}));
if (featured.length) check("ย้ายการ์ดปักหมุด", await db.from("featured_cards").upsert(featured));

// ราคาแบ่งเป็นก้อนละ 500 แถว เผื่อวันที่ประวัติราคายาวจนยิงทีเดียวไม่ไหว
const prices = (overrides.pricePoints ?? []).map((p) => ({
  variant_id: p.variantId,
  condition: p.condition,
  price_thb: p.priceThb,
  source: p.source ?? "market",
  recorded_at: p.recordedAt,
}));
for (let i = 0; i < prices.length; i += 500) {
  check(`ย้ายราคา (${i + 1}–${Math.min(i + 500, prices.length)})`, await db.from("price_points").insert(prices.slice(i, i + 500)));
}

const userRows = users.map((u) => ({
  id: u.id,
  email: u.email,
  display_name: u.displayName,
  password_hash: u.passwordHash,
  created_at: u.createdAt,
}));
if (userRows.length) check("ย้ายผู้ใช้", await db.from("users").upsert(userRows));

const holdingRows = portfolios.map(({ userId, holding }) => ({
  id: holding.id,
  user_id: userId,
  card_id: holding.cardId,
  condition: holding.condition,
  quantity: holding.quantity,
  cost_thb: holding.costThb ?? null,
  note: holding.note ?? null,
  added_at: holding.addedAt,
}));
if (holdingRows.length) check("ย้ายพอร์ต", await db.from("portfolio_holdings").upsert(holdingRows));

const resetRows = resets.map((r) => ({
  email: r.email,
  display_name: r.displayName,
  path: r.path,
  requested_at: r.requestedAt,
  expires_at: r.expiresAt,
}));
if (resetRows.length) {
  check("ย้ายคำขอตั้งรหัสใหม่", await db.from("password_resets").upsert(resetRows));
}

// ---------- รูปการ์ด ----------

for (const blob of imageBlobs) {
  const result = await get(blob.pathname, { access: "private", useCache: false, token });
  if (!result) continue;

  const body = await new Response(result.stream).arrayBuffer();
  const contentType = result.headers.get("content-type") ?? "image/png";

  const { error } = await db.storage
    .from("card-images")
    .upload(blob.pathname, body, { contentType, upsert: true });

  if (error) exit(`ย้ายรูป ${blob.pathname} ล้มเหลว: ${error.message}`);
  console.log(`  รูป ${blob.pathname}`);
}

console.log("\n✔ ย้ายเสร็จแล้ว ของเดิมใน Blob ยังอยู่ครบ ไม่ได้ลบอะไรทิ้ง");
console.log("  ขั้นต่อไป: ใส่ SUPABASE_URL กับ SUPABASE_SERVICE_ROLE_KEY บน Vercel แล้วดีพลอย\n");
