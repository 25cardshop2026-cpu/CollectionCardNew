import Link from "next/link";
import { CardTable, type CardTableRow } from "@/components/admin/CardTable";
import { SnkrdunkSyncButton } from "@/components/admin/SnkrdunkSyncButton";
import { listAdminPriceRows, listAllSets, loadState } from "@/lib/repo";
import { VARIANT_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    set?: string;
    added?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { set: requested, added, saved, deleted, error } = await searchParams;
  await loadState();

  const sets = listAllSets();
  const active = sets.find((s) => s.code === requested) ?? sets[0];

  const rows: CardTableRow[] = active
    ? listAdminPriceRows(active.code).map((row) => ({
        cardId: row.card.id,
        variantId: row.variant.id,
        slug: row.card.slug,
        number: row.card.number,
        nameTh: row.card.nameTh,
        nameEn: row.card.nameEn,
        rarity: row.card.rarity,
        variantLabel: VARIANT_LABEL[row.card.variantType],
        sourceUrl: row.card.sourceUrl ?? "",
        imageUrl: row.card.imageUrl ?? "",
        prices: row.prices,
        staleDays: row.staleDays,
      }))
    : [];

  const stale = rows.filter((row) => (row.staleDays ?? Infinity) > 7).length;

  const notice = added
    ? `เพิ่มการ์ด ${added} แล้ว — เปิดหน้าเว็บดูได้เลย`
    : saved
      ? `บันทึกการแก้ไข ${saved} แล้ว`
      : deleted
        ? `ลบการ์ด ${deleted} แล้ว`
        : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight">จัดการการ์ด</h2>
          <p className="max-w-[68ch] text-[13.5px] text-ink-2">
            หน้าเดียวจบ — เปิดลิงก์ต้นทางใต้ชื่อการ์ดไปดูราคา แล้วกรอกกลับเข้าช่อง
            NM · PSA 10 · eBay · SNKRDUNK ในแถวเดียวกัน ทุกช่องบันทึกทันทีที่กด Enter
            หรือคลิกออกจากช่อง และเก็บเป็นประวัติราคาแถวใหม่เสมอ ไม่เขียนทับของเดิม
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SnkrdunkSyncButton />
          <Link
            href={`/admin/sets/new`}
            className="rounded-[4px] border border-line-strong px-3 py-1.5 text-[13px] hover:border-accent hover:text-accent"
          >
            + เพิ่มชุด
          </Link>
          <Link
            href={`/admin/cards/new${active ? `?set=${active.code}` : ""}`}
            className="rounded-[4px] border border-accent bg-accent px-3 py-1.5 text-[13px] font-bold text-on-accent"
          >
            + เพิ่มการ์ด
          </Link>
        </div>
      </header>

      {error && (
        <p className="rounded-[4px] border border-down/50 bg-down/5 px-3 py-2 text-[13px] text-down">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-[4px] border border-up/50 bg-up/5 px-3 py-2 text-[13px] text-up">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-y border-line py-3">
        <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
          ชุด
        </span>
        {sets.map((set) => (
          <Link
            key={set.code}
            href={`/admin/cards?set=${set.code}`}
            className={`rounded-[3px] border px-2 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.06em] ${
              set.code === active?.code
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-ink-2 hover:border-accent hover:text-accent"
            }`}
          >
            {set.code}
          </Link>
        ))}
      </div>

      {!active ? (
        <p className="text-ink-3">ยังไม่มีชุดในระบบ เริ่มจากกด “เพิ่มชุด” ก่อน</p>
      ) : (
        <>
          <p className="font-mono text-[12px] text-ink-3">
            {active.code} · {active.nameTh} — มีในฐานข้อมูล {rows.length}/{active.totalCards} ใบ
            {stale > 0 && (
              <span className="ml-2 text-down">· ราคาค้างเกิน 7 วัน {stale} ใบ</span>
            )}
          </p>

          {rows.length === 0 ? (
            <p className="text-ink-3">ชุดนี้ยังไม่มีการ์ด กด “เพิ่มการ์ด” เพื่อเริ่ม</p>
          ) : (
            // key ผูกกับชุด เพื่อให้ค่าในช่องกรอกถูกตั้งใหม่ทั้งตารางตอนสลับชุด
            <CardTable key={active.code} rows={rows} setCode={active.code} />
          )}
        </>
      )}
    </div>
  );
}
