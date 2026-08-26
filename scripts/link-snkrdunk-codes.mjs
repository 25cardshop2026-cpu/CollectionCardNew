// สคริปต์ผูกเลขสินค้า SNKRDUNK ให้การ์ดในระบบอัตโนมัติ ทำได้เฉพาะรุ่นพิมพ์
// "normal" กับ "parallel" เท่านั้น (มีรูปแบบชื่อ "-P" ต่อท้ายที่เชื่อถือได้)
// รุ่นอื่น (alt_art/manga/full_art/promo) ข้ามหมด ให้ใช้ช่องค้นหาช่วยในแดชบอร์ดแทน
//
// จับคู่แบบระมัดระวัง: ต้องมีผู้สมัครที่ตรงเป๊ะแค่ทางเดียวเท่านั้นถึงจะผูกให้
// เจอมากกว่าหนึ่ง หรือไม่เจอเลย = ข้าม ไม่เดา
//
// ยิงถี่เกินไปแล้วโดน SNKRDUNK บล็อกชั่วคราวมาแล้วรอบนึง (502 รัวเป็นร้อย)
// จึงมี retry + cooldown อัตโนมัติ ไม่ใช่แค่ข้ามแล้วรายงานว่าล้มเหลว
//
// รัน: node scripts/link-snkrdunk-codes.mjs [--limit=N] [--dry-run]

const BASE_URL = "https://collection-card-three.vercel.app";
const DELAY_MS = 1200;
const MAX_RETRIES = 3;
const COOLDOWN_AFTER_CONSECUTIVE_FAILS = 3;
const COOLDOWN_MS = 60_000;

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const DRY_RUN = args.includes("--dry-run");

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
    if (attempt < MAX_RETRIES) await sleep(2000 * 2 ** attempt); // 2s, 4s, 8s
  }
  return { ok: false, error: lastErr };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** เลือกผู้สมัครที่ "ตรงเป๊ะทางเดียว" ให้รุ่นพิมพ์ที่ต้องการ คืน null ถ้าไม่ชัวร์ */
function pickMatch(results, number, variantType) {
  const numPattern = escapeRegExp(`[${number}]`);
  const withNumber = results.filter((r) => new RegExp(numPattern).test(r.name));
  if (withNumber.length === 0) return null;

  // เลือกฉบับที่ไม่ใช่ [EN] ก่อนเสมอถ้ามี — เป็นฉบับที่มีของขายเยอะกว่า
  const nonEn = withNumber.filter((r) => !r.name.includes("[EN]"));
  const pool = nonEn.length > 0 ? nonEn : withNumber;

  const parallelPattern = new RegExp(`-P\\s*${numPattern}`);
  const bucket = pool.filter((r) =>
    variantType === "parallel" ? parallelPattern.test(r.name) : !parallelPattern.test(r.name),
  );

  if (bucket.length === 1) return bucket[0];

  // ยังก้ำกึ่งอยู่ — ถ้าตัดเหลือแค่ฉบับ "Booster Pack" (ของแท้จากบูสเตอร์) ได้พอดี
  // หนึ่งใบ ก็เอาอันนั้น เพราะการ์ดในระบบเราต้นทางมาจากบูสเตอร์เสมอ ไม่ใช่โปรโม/
  // ของแถมชุดพิเศษที่มีเลขการ์ดซ้ำกันได้
  const boosterOnly = bucket.filter((r) => r.name.includes("Booster Pack"));
  return boosterOnly.length === 1 ? boosterOnly[0] : null;
}

async function main() {
  console.log("โหลดรายการการ์ดทั้งหมด...");
  const exportRes = await fetchJsonWithRetry(`${BASE_URL}/api/export-cards`);
  if (!exportRes.ok) throw exportRes.error;
  const { rows } = exportRes.data;

  const targets = rows.filter(
    (r) => !r.snkrdunkCode && (r.variantType === "normal" || r.variantType === "parallel"),
  );

  // จัดกลุ่มตามเลขการ์ด เพราะ normal/parallel ของเลขเดียวกันค้นด้วยคำเดียวกันได้
  const groups = new Map();
  for (const row of targets) {
    const key = `${row.setCode}::${row.number}::${row.nameEn}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  console.log(
    `พบ ${targets.length} แถวที่ยังไม่ผูก (จาก ${rows.length} รวม) แบ่งเป็น ${groups.size} คำค้นหา`,
  );

  let linked = 0;
  let skipped = 0;
  let failed = 0;
  let consecutiveFails = 0;
  const unresolved = [];
  const stillFailed = [];
  let done = 0;
  const groupEntries = [...groups.entries()].slice(0, LIMIT);

  for (const [key, groupRows] of groupEntries) {
    done++;
    const [setCode, number, nameEn] = key.split("::");
    const query = `${nameEn} ${number}`.trim();

    const searchRes = await fetchJsonWithRetry(
      `${BASE_URL}/api/snkrdunk-search?q=${encodeURIComponent(query)}`,
    );

    if (!searchRes.ok) {
      failed += groupRows.length;
      consecutiveFails++;
      stillFailed.push({ setCode, number, nameEn, query, rows: groupRows.map((r) => r.id) });
      console.log(`✗ ค้นหา "${query}" ล้มเหลวหลัง retry: ${searchRes.error.message}`);

      if (consecutiveFails >= COOLDOWN_AFTER_CONSECUTIVE_FAILS) {
        console.log(
          `--- ล้มเหลวติดกัน ${consecutiveFails} ครั้ง พักไว้ ${COOLDOWN_MS / 1000} วิ กัน SNKRDUNK บล็อกซ้ำ ---`,
        );
        await sleep(COOLDOWN_MS);
        consecutiveFails = 0;
      }
    } else {
      consecutiveFails = 0;
      const { results } = searchRes.data;

      for (const row of groupRows) {
        const match = pickMatch(results ?? [], number, row.variantType);
        if (!match) {
          skipped++;
          unresolved.push({ id: row.id, setCode, number, nameEn, variantType: row.variantType, query });
          continue;
        }

        if (DRY_RUN) {
          console.log(`[dry-run] ${row.id} -> ${match.productId} (${match.name})`);
          linked++;
          continue;
        }

        const saveRes = await fetchJsonWithRetry(`${BASE_URL}/api/card-source`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: row.id, sourceUrl: match.link }),
        });
        if (saveRes.ok) {
          linked++;
          console.log(`✓ ${row.id} -> ${match.productId} (${match.name})`);
        } else {
          failed++;
          console.log(`✗ ${row.id} บันทึกไม่สำเร็จ: ${saveRes.error.message}`);
        }
      }
    }

    if (done % 25 === 0) {
      console.log(
        `--- ความคืบหน้า ${done}/${groupEntries.length} คำค้นหา (ผูกแล้ว ${linked}, ข้าม ${skipped}, พลาด ${failed}) ---`,
      );
    }

    await sleep(DELAY_MS);
  }

  console.log("\n=== สรุป ===");
  console.log(`ผูกสำเร็จ: ${linked}`);
  console.log(`ข้าม (จับคู่ไม่ชัวร์): ${skipped}`);
  console.log(`ผิดพลาด (แม้ retry แล้ว): ${failed}`);

  const fs = await import("node:fs");
  if (unresolved.length > 0) {
    fs.writeFileSync("scripts/snkrdunk-unresolved.json", JSON.stringify(unresolved, null, 2));
    console.log(`บันทึกรายการที่ข้าม (จับคู่ไม่ชัวร์) ไว้ที่ scripts/snkrdunk-unresolved.json (${unresolved.length} ใบ)`);
  }
  if (stillFailed.length > 0) {
    fs.writeFileSync("scripts/snkrdunk-failed.json", JSON.stringify(stillFailed, null, 2));
    console.log(`บันทึกรายการที่ยิงพลาด (ลองใหม่ทีหลังได้) ไว้ที่ scripts/snkrdunk-failed.json (${stillFailed.length} กลุ่ม)`);
  }
}

main().catch((err) => {
  console.error("สคริปต์ล้มเหลว:", err);
  process.exit(1);
});
