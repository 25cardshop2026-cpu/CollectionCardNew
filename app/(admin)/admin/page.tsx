import Link from "next/link";
import { formatAge, formatBaht, formatPercent, trendClass } from "@/lib/format";
import { th } from "@/lib/i18n/th";
import { getAdminStats, listMovers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function AdminOverviewPage() {
  const stats = getAdminStats();
  const movers = listMovers(8);

  const tiles = [
    { label: "เกม", value: stats.games.toString() },
    { label: "ชุด", value: stats.sets.toString() },
    { label: "การ์ด", value: stats.cards.toLocaleString("th-TH") },
    { label: "เวอร์ชันการ์ด", value: stats.variants.toLocaleString("th-TH") },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border border-line bg-surface p-4 flex flex-col gap-1"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
              {tile.label}
            </span>
            <span className="font-mono text-2xl font-bold tabular-nums">{tile.value}</span>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div
          className={`rounded-lg border p-4 flex flex-col gap-1 ${
            stats.stale > 0 ? "border-down/50 bg-down/5" : "border-line bg-surface"
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            ราคาค้างเกิน 7 วัน
          </span>
          <span className="font-mono text-2xl font-bold tabular-nums">
            {stats.stale.toLocaleString("th-TH")}
          </span>
          <Link href="/admin/prices" className="text-[13px] text-gold hover:underline">
            ไปอัปเดตราคา →
          </Link>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            อัปเดตล่าสุด
          </span>
          <span className="text-[15px]">
            {stats.lastUpdated ? formatAge(stats.lastUpdated, th) : "ยังไม่มีข้อมูล"}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
          ราคาขยับแรงใน 7 วัน
        </h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {movers.map((mover) => (
            <li key={mover.variant.id} className="flex items-center gap-4 px-4 py-2.5">
              <span className="font-mono text-[12px] text-ink-3 w-[92px] shrink-0">
                {mover.card.number}
              </span>
              <Link
                href={`/card/${mover.card.slug}`}
                className="flex-1 min-w-0 truncate text-[13.5px] hover:text-gold"
              >
                {mover.card.nameTh}
              </Link>
              <span className="font-mono text-[13px] tabular-nums text-ink-2">
                {formatBaht(mover.price.priceThb)}
              </span>
              <span
                className={`font-mono text-[12.5px] tabular-nums w-[64px] text-right ${trendClass(
                  mover.price.change7d,
                )}`}
              >
                {formatPercent(mover.price.change7d)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
