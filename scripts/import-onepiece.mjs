/**
 * ดึงรายชื่อการ์ด One Piece จากเว็บทางการ (asia-th) ลงเป็นไฟล์แคตตาล็อกของเรา
 *
 *   node scripts/import-onepiece.mjs            ดึงบูสเตอร์ทั้งหมด
 *   node scripts/import-onepiece.mjs OP-15 OP-16   ดึงเฉพาะชุดที่ระบุ
 *
 * ดึงเฉพาะข้อมูลตัวหนังสือ ไม่ดึงรูปการ์ด เพราะรูปเป็นงานมีลิขสิทธิ์
 * และเว้นจังหวะระหว่างคำขอ เพื่อไม่ให้ยิงถี่เกินไปใส่เว็บเขา
 *
 * หน้าเว็บส่ง HTML มาครบตั้งแต่ฝั่งเซิร์ฟเวอร์ จึงอ่านด้วย regex ได้
 * ไม่ต้องพึ่งเบราว์เซอร์จำลองหรือไลบรารีเพิ่ม
 */

import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://asia-th.onepiece-cardgame.com";
const OUT_FILE = path.join(process.cwd(), "data", "onepiece-catalog.json");
const CACHE_DIR = path.join(process.cwd(), ".cache", "onepiece");
const DELAY_MS = 400;

/** ชุดที่นับว่าเป็นบูสเตอร์ — สตาร์ทเตอร์เด็คกับของแถมไม่เอา */
const BOOSTER_PREFIX = /^(OP|EB|PRB)-/;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function getHtml(url, cacheKey) {
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.html`);
  if (fs.existsSync(cacheFile)) return fs.readFileSync(cacheFile, "utf8");

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (collection-card catalog importer)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);

  const html = await res.text();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, html);
  await wait(DELAY_MS);
  return html;
}

const stripTags = (s) => s.replace(/<[^>]*>/g, " ");

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** รายชื่อชุดทั้งหมดมาจาก dropdown ในหน้า cardlist */
async function listSeries() {
  const html = await getHtml(`${ORIGIN}/cardlist/`, "index");
  const out = [];

  for (const m of html.matchAll(/<option value="(\d+)"[^>]*>([\s\S]*?)<\/option>/g)) {
    const label = decode(stripTags(m[2]));
    const code = label.match(/\[([A-Z]+-\d+)\]/)?.[1];
    if (!code) continue;
    out.push({ seriesId: m[1], code, label });
  }

  return out;
}

/**
 * วันวางจำหน่ายไม่มีในหน้ารายชื่อการ์ด ต้องไปเก็บจากหน้ารายการสินค้า
 * ซึ่งแบ่งหน้าละ 12 รายการ จึงไล่ทีละหน้าจนกว่าจะไม่เจอรายการใหม่
 */
async function releaseDates() {
  const dates = new Map();

  for (let page = 1; page <= 10; page++) {
    const html = await getHtml(
      `${ORIGIN}/products/?subcategory=boosters&page=${page}&view=normal`,
      `products-${page}`,
    );

    let found = 0;
    for (const m of html.matchAll(
      /<h4 class="linkListColTitle">([\s\S]*?)<\/h4>[\s\S]*?datetime="(\d{4}-\d{2}-\d{2})"/g,
    )) {
      const code = decode(m[1]).match(/\[([A-Z]+-\d+)\]/)?.[1];
      if (!code || dates.has(code)) continue;
      dates.set(code, m[2]);
      found++;
    }

    if (found === 0) break;
  }

  return dates;
}

/** เลขการ์ดบอกชุดต้นทาง: OP01-120 -> OP-01, EB01-009 -> EB-01 */
function setCodeFromNumber(number) {
  const m = number.match(/^([A-Z]+)(\d+)-/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** ตัดชื่อชุดออกจากป้ายใน dropdown เช่น "BOOSTER PACK -ชื่อชุด- [OP-15]" */
function setNameFrom(label) {
  const dashed = label.match(/-([^[\]]+)-\s*\[/);
  if (dashed) return dashed[1].trim();
  return label.replace(/\s*\[[A-Z]+-\d+\]\s*/, "").trim();
}

function parseCards(html) {
  const cards = [];

  for (const block of html.matchAll(/<dl class="modalCol" id="([^"]+)">([\s\S]*?)<\/dl>/g)) {
    const rawId = block[1];
    const body = block[2];

    const info = [...body.matchAll(/<div class="infoCol">([\s\S]*?)<\/div>/g)][0]?.[1] ?? "";
    const parts = [...info.matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]));
    if (parts.length < 3) continue;

    const field = (cls) => {
      const m = body.match(new RegExp(`<div class="${cls}">([\\s\\S]*?)</div>`));
      if (!m) return { label: "", value: "" };
      const label = decode(m[1].match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? "");
      return { label, value: decode(stripTags(m[1].replace(/<h3>[\s\S]*?<\/h3>/, ""))) };
    };

    // ช่องเดียวกันในหน้าเว็บใช้เก็บ "คอสต์" ของการ์ดทั่วไป แต่เก็บ "ไลฟ์"
    // ของใบผู้นำ ดูจากหัวข้อในช่องว่าอันไหน ไม่งั้นไลฟ์จะถูกอ่านเป็นคอสต์
    const costCol = field("cost");
    const isLife = costCol.label.includes("ไลฟ์");

    cards.push({
      // _p1 _p2 คือใบพิมพ์พิเศษของเลขเดียวกัน เก็บไว้แยกเป็น variant ทีหลัง
      printing: rawId.includes("_") ? rawId.split("_")[1] : "",
      number: parts[0],
      rarity: parts[1],
      cardType: parts[2],
      name: decode(body.match(/<div class="cardName">([\s\S]*?)<\/div>/)?.[1] ?? ""),
      color: field("color").value,
      cost: isLife ? "" : costCol.value,
      life: isLife ? costCol.value : "",
      power: field("power").value,
      counter: field("counter").value,
    });
  }

  return cards;
}

async function main() {
  const wanted = process.argv.slice(2).map((s) => s.toUpperCase());
  const series = (await listSeries()).filter(
    (s) => BOOSTER_PREFIX.test(s.code) && (wanted.length === 0 || wanted.includes(s.code)),
  );

  const dates = await releaseDates();
  console.log(`พบชุดบูสเตอร์ ${series.length} ชุด · มีวันวางจำหน่าย ${dates.size} ชุด`);

  const codes = new Set(series.map((s) => s.code));
  const byNumber = new Map();
  let reprints = 0;

  for (const entry of series) {
    const html = await getHtml(
      `${ORIGIN}/cardlist/?series=${entry.seriesId}`,
      entry.code.toLowerCase(),
    );

    for (const row of parseCards(html)) {
      // เลขการ์ดบอกชุดต้นทางอยู่แล้ว (OP01-120 = ของ OP-01) ใช้อันนั้นเป็นหลัก
      // ไม่ใช่กล่องที่เจอ ไม่งั้นการ์ดเก่าที่ถูกพิมพ์ซ้ำในกล่องรวมฮิตจะย้ายชุด
      const home = setCodeFromNumber(row.number);
      const setCode = home && codes.has(home) ? home : entry.code;

      const existing = byNumber.get(row.number);
      if (existing) {
        reprints++;
        // ใบพิมพ์พิเศษเก็บรวมจากทุกกล่อง เพราะเป็นอาร์ตคนละแบบที่มีอยู่จริง
        if (row.printing && !existing.printings.includes(row.printing)) {
          existing.printings.push(row.printing);
        }
        continue;
      }

      byNumber.set(row.number, {
        setCode,
        number: row.number,
        name: row.name,
        rarity: row.rarity,
        cardType: row.cardType,
        color: row.color,
        cost: row.cost,
        life: row.life,
        power: row.power,
        counter: row.counter,
        printings: row.printing ? [row.printing] : [],
      });
    }
  }

  const cards = [...byNumber.values()].sort((a, b) => a.number.localeCompare(b.number));

  const sets = series.map((entry) => {
    const owned = cards.filter((c) => c.setCode === entry.code).length;
    console.log(`  ${entry.code.padEnd(7)} ${String(owned).padStart(4)} ใบ  ${setNameFrom(entry.label)}`);

    return {
      code: entry.code,
      name: setNameFrom(entry.label),
      seriesId: entry.seriesId,
      releaseDate: dates.get(entry.code) ?? "",
      totalCards: owned,
    };
  });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ source: ORIGIN, sets, cards }, null, 2) + "\n",
    "utf8",
  );

  const withPrintings = cards.filter((c) => c.printings.some((p) => p.startsWith("p"))).length;
  console.log(
    `\nเขียนลง ${path.relative(process.cwd(), OUT_FILE)} — ${sets.length} ชุด · ${cards.length} ใบ` +
      ` · มีใบอาร์ตพิเศษ ${withPrintings} ใบ · รายการพิมพ์ซ้ำข้ามกล่องที่ยุบรวม ${reprints} รายการ`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
