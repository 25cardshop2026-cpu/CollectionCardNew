// สคริปต์ตรวจสอบว่าการ์ดใบไหนยังไม่มีเลขสินค้า SNKRDUNK ผูกอยู่บ้าง หลังรัน
// link-snkrdunk-codes.mjs แล้ว สรุปแยกตามชุด พร้อมเหตุผลที่ยังไม่มี
//
// รัน: node scripts/audit-missing-links.mjs

const BASE_URL = "https://collection-card-three.vercel.app";

const res = await fetch(`${BASE_URL}/api/export-cards`);
const { rows } = await res.json();

let unresolvedIds = new Set();
try {
  const fs = await import("node:fs");
  const unresolved = JSON.parse(fs.readFileSync("scripts/snkrdunk-unresolved.json", "utf8"));
  unresolvedIds = new Set(unresolved.map((r) => r.id));
} catch {
  // ไม่มีไฟล์ก็ไม่เป็นไร แค่ไม่แยกเหตุผลละเอียด
}

const missing = rows.filter((r) => !r.snkrdunkCode);
const bySkippedVariant = missing.filter((r) => r.variantType !== "normal" && r.variantType !== "parallel");
const byAmbiguous = missing.filter(
  (r) => (r.variantType === "normal" || r.variantType === "parallel") && unresolvedIds.has(r.id),
);
const byOther = missing.filter((r) => !bySkippedVariant.includes(r) && !byAmbiguous.includes(r));

console.log(`ทั้งหมด ${rows.length} แถว — ยังไม่มีเลขสินค้า ${missing.length} แถว\n`);
console.log(`  รุ่นพิมพ์ที่สคริปต์ข้ามโดยตั้งใจ (alt_art/manga/full_art/promo ฯลฯ): ${bySkippedVariant.length}`);
console.log(`  ค้นหาแล้วไม่ชัวร์ (normal/parallel): ${byAmbiguous.length}`);
console.log(`  อื่น ๆ (ยังไม่เคยลองค้นหาเลย): ${byOther.length}\n`);

function groupBySet(list) {
  const bySet = new Map();
  for (const r of list) {
    if (!bySet.has(r.setCode)) bySet.set(r.setCode, []);
    bySet.get(r.setCode).push(r);
  }
  return [...bySet.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function printGroup(title, list) {
  console.log(`\n=== ${title} (${list.length}) ===`);
  for (const [setCode, items] of groupBySet(list)) {
    console.log(`\n${setCode} (${items.length} ใบ):`);
    for (const r of items) {
      console.log(`  ${r.id}\t${r.nameTh || r.nameEn}\t[${r.variantType}]${r.hasImage ? "" : "\tไม่มีรูปด้วย"}`);
    }
  }
}

printGroup("รุ่นพิมพ์ที่ข้ามโดยตั้งใจ", bySkippedVariant);
printGroup("ค้นหาแล้วไม่ชัวร์", byAmbiguous);
printGroup("อื่น ๆ", byOther);

const fs = await import("node:fs");
fs.writeFileSync(
  "scripts/missing-links-report.json",
  JSON.stringify({ total: rows.length, missing: missing.length, bySkippedVariant, byAmbiguous, byOther }, null, 2),
);
console.log("\nบันทึกรายงานเต็มไว้ที่ scripts/missing-links-report.json");
