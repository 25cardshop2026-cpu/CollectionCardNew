import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/Chip";
import { formatBaht, formatPercent, trendClass } from "@/lib/format";
import { listMovers } from "@/lib/repo";
import { VARIANT_LABEL } from "@/lib/types";

export const metadata: Metadata = {
  title: "ราคาขยับแรงใน 7 วัน",
  description:
    "การ์ดสะสม One Piece และ Pokémon ที่ราคาขึ้นและลงมากที่สุดในรอบ 7 วัน",
};

export const dynamic = "force-dynamic";

export default function MoversPage() {
  const movers = listMovers(24);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Eyebrow>7 วันล่าสุด</Eyebrow>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ราคาขยับแรง</h1>
        <p className="max-w-[62ch] text-ink-2">
          เรียงตามขนาดการเปลี่ยนแปลงของราคา ไม่ว่าจะขึ้นหรือลง คิดจากราคาสภาพ NM
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line">
              {["การ์ด", "ชุด", "เวอร์ชัน", "ราคา", "7 วัน"].map((head, i) => (
                <th
                  key={head}
                  className={`px-4 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3 ${
                    i >= 3 ? "text-right" : "text-left"
                  }`}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movers.map((mover) => (
              <tr
                key={mover.variant.id}
                className="border-b border-line last:border-0 hover:bg-surface-2"
              >
                <td className="px-4 py-2.5">
                  <Link href={`/card/${mover.card.slug}`} className="hover:text-accent">
                    <span className="font-mono text-[11.5px] text-ink-3 mr-2">
                      {mover.card.number}
                    </span>
                    {mover.card.nameTh}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-ink-3 whitespace-nowrap">
                  {mover.set.code}
                </td>
                <td className="px-4 py-2.5 text-[12.5px] text-ink-2 whitespace-nowrap">
                  {VARIANT_LABEL[mover.variant.variantType]}
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink-2 whitespace-nowrap">
                  {formatBaht(mover.price.priceThb)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap ${trendClass(
                    mover.price.change7d,
                  )}`}
                >
                  {formatPercent(mover.price.change7d)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
