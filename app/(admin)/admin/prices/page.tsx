import Link from "next/link";
import { PriceEditor, type PriceRow } from "@/components/admin/PriceEditor";
import { listAdminPriceRows, listGames, listSets, loadState } from "@/lib/repo";
import { VARIANT_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPricesPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>;
}) {
  const { set: requested } = await searchParams;
  await loadState();

  const allSets = listGames().flatMap((game) =>
    listSets(game.slug).map((set) => ({ game, set })),
  );
  const active =
    allSets.find((entry) => entry.set.code === requested) ?? allSets[0];

  const rows: PriceRow[] = listAdminPriceRows(active.set.code).map((row) => ({
    variantId: row.variant.id,
    cardNumber: row.card.number,
    cardName: row.card.nameTh,
    variantLabel: VARIANT_LABEL[row.variant.variantType],
    price: row.current?.priceThb ?? null,
    psaPrice: row.psa?.priceThb ?? null,
    staleDays: row.staleDays,
  }));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <h2 className="text-xl font-bold tracking-tight">อัปเดตราคา</h2>
        <p className="max-w-[62ch] text-[13.5px] text-ink-2">
          ทุกครั้งที่บันทึกจะเพิ่มแถวใหม่ในประวัติราคา ไม่เขียนทับของเดิม
          เพื่อให้กราฟย้อนหลังสะสมข้อมูลไปเรื่อย ๆ
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-y border-line py-3">
        <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
          ชุด
        </span>
        {allSets.map(({ game, set }) => (
          <Link
            key={set.code}
            href={`/admin/prices?set=${set.code}`}
            className={`rounded-[3px] border px-2 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.06em] ${
              set.code === active.set.code
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-ink-2 hover:border-accent hover:text-accent"
            }`}
            title={`${game.nameEn} · ${set.nameTh}`}
          >
            {set.code}
          </Link>
        ))}
      </div>

      <PriceEditor key={active.set.code} rows={rows} />
    </div>
  );
}
