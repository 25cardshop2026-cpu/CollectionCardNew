// เติมรูปการ์ดให้ทุกใบที่ผูกเลขสินค้า SNKRDUNK ไว้แล้วแต่ยังไม่มีรูป
// ดึง thumbnailUrl จาก SNKRDUNK ตรง ๆ (เครื่องที่รันสคริปต์นี้ได้ IP ไทยจริง
// เลยได้ข้อมูลที่แม่นกว่าเซิร์ฟเวอร์ของเว็บเอง) แล้วส่งให้ /api/card-image-from-url
// อัปโหลดเข้าที่เก็บของเว็บให้ — ท่อนั้นจะตรวจซ้ำเองว่าใบไหนมีรูปแล้วก็ข้าม
//
// รัน: node scripts/backfill-images.mjs [--limit=N]

const BASE_URL = "https://collection-card-five.vercel.app";
const DELAY_MS = 500;
const BATCH_SIZE = 25;
const MAX_RETRIES = 3;

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithRetry(url, opts) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return { ok: true, data: await res.json() };
      lastErr = new Error(`${res.status} ${url}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < MAX_RETRIES) await sleep(2000 * 2 ** attempt);
  }
  return { ok: false, error: lastErr };
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function main() {
  console.log("โหลดรายการการ์ดทั้งหมด...");
  const exportRes = await fetchJsonWithRetry(`${BASE_URL}/api/export-cards`);
  if (!exportRes.ok) throw exportRes.error;
  const { rows } = exportRes.data;

  const targets = rows.filter((r) => r.snkrdunkCode && !r.hasImage).slice(0, LIMIT);
  console.log(`พบ ${targets.length} ใบที่มีเลขสินค้าแล้วแต่ยังไม่มีรูป`);

  // เอา thumbnailUrl มาจาก SNKRDUNK เป็นก้อน ๆ (25 รหัสต่อคำขอ) ยิงตรงจากเครื่องนี้
  const codeToThumbnail = new Map();
  for (const batch of chunk([...new Set(targets.map((r) => r.snkrdunkCode))], BATCH_SIZE)) {
    const params = new URLSearchParams();
    for (const code of batch) params.append("identifiers", `SW---${code}`);

    const res = await fetchJsonWithRetry(
      `https://snkrdunk.com/en/v1/products/summaries?${params.toString()}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) {
      console.log(`✗ ดึง thumbnail ของกลุ่มนี้ล้มเหลว: ${res.error.message}`);
      continue;
    }
    for (const item of res.data.productSummaries ?? []) {
      if (item.code?.startsWith("SW---") && item.thumbnailUrl) {
        codeToThumbnail.set(item.code.slice("SW---".length), item.thumbnailUrl);
      }
    }
    await sleep(DELAY_MS);
  }
  console.log(`ได้ thumbnail มา ${codeToThumbnail.size} รายการ`);

  let filled = 0;
  let skipped = 0;
  let failed = 0;
  let done = 0;

  for (const row of targets) {
    done++;
    const thumbnailUrl = codeToThumbnail.get(row.snkrdunkCode);
    if (!thumbnailUrl) {
      skipped++;
      continue;
    }

    const res = await fetchJsonWithRetry(`${BASE_URL}/api/card-image-from-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: row.id, imageUrl: thumbnailUrl }),
    });

    if (res.ok && res.data.imageUrl) {
      filled++;
      console.log(`✓ ${row.id}`);
    } else if (res.ok && res.data.skipped) {
      skipped++;
    } else {
      failed++;
      console.log(`✗ ${row.id} ล้มเหลว: ${res.ok ? res.data.error : res.error.message}`);
    }

    if (done % 50 === 0) {
      console.log(`--- ความคืบหน้า ${done}/${targets.length} (เติมแล้ว ${filled}, ข้าม ${skipped}, พลาด ${failed}) ---`);
    }

    await sleep(DELAY_MS);
  }

  console.log("\n=== สรุป ===");
  console.log(`เติมรูปสำเร็จ: ${filled}`);
  console.log(`ข้าม: ${skipped}`);
  console.log(`พลาด: ${failed}`);
}

main().catch((err) => {
  console.error("สคริปต์ล้มเหลว:", err);
  process.exit(1);
});
