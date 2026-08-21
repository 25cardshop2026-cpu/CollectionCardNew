import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "@/components/Chip";
import { formatBaht, formatPercent, trendClass } from "@/lib/format";
import { listMovers } from "@/lib/repo";
import { VARIANT_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ราคาขยับแรงใน 7 วัน",
  description:
    "การ์ดสะสม One Piece และ Pokémon ที่ราคาขึ้นและลงมากที่สุดในรอบ 7 วัน",
};

export default function MoversPage() {
  const movers = listMovers(24);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-4">
        <p className="eyebrow">7 วันล่าสุด</p>
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em]">
          ราคาขยับแรง
        </h1>
        <div className="gold-rule h-px w-24" aria-hidden="true" />
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
          เรียงตามขนาดการเปลี่ยนแปลงของราคา ไม่ว่าจะขึ้นหรือลง คิดจากราคาสภาพ NM
        </p>
      </header>

      {/* ชุดกับเวอร์ชันถูกซ่อนบนจอแคบ เพื่อให้คอลัมน์ % ซึ่งเป็นหัวใจของหน้านี้ไม่ตกขอบ */}
      <div className="vitrine min-w-0 overflow-hidden">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-line">
              <th className="px-3 py-4 text-left font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3 sm:px-5">
                #
              </th>
              <th className="px-3 py-4 text-left font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3 sm:px-5">
                การ์ด
              </th>
              <th className="hidden px-5 py-4 text-left font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3 md:table-cell">
                ชุด
              </th>
              <th className="hidden px-5 py-4 text-left font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3 lg:table-cell">
                เวอร์ชัน
              </th>
              <th className="px-3 py-4 text-right font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3 sm:px-5">
                ราคา
              </th>
              <th className="px-3 py-4 text-right font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3 sm:px-5">
                7 วัน
              </th>
            </tr>
          </thead>
          <tbody>
            {movers.map((mover, index) => (
              <tr
                key={mover.variant.id}
                className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
              >
                <td className="px-3 py-3 align-top font-mono text-[12px] tabular-nums text-ink-3 sm:px-5">
                  {index + 1}
                </td>
                <td className="px-3 py-3 sm:px-5">
                  <Link
                    href={`/card/${mover.card.slug}`}
                    className="flex flex-col gap-0.5 transition-colors hover:text-gold"
                  >
                    <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3">
                      {mover.card.number}
                      <span className="md:hidden"> · {mover.set.code}</span>
                    </span>
                    <span className="leading-snug">{mover.card.nameTh}</span>
                    <span className="text-[11.5px] text-ink-3 lg:hidden">
                      {VARIANT_LABEL[mover.variant.variantType]}
                    </span>
                  </Link>
                </td>
                <td className="hidden whitespace-nowrap px-5 py-3 md:table-cell">
                  <Chip tone="quiet">{mover.set.code}</Chip>
                </td>
                <td className="hidden whitespace-nowrap px-5 py-3 text-[12.5px] text-ink-2 lg:table-cell">
                  {VARIANT_LABEL[mover.variant.variantType]}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right align-top font-mono tabular-nums sm:px-5">
                  {formatBaht(mover.price.priceThb)}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-3 text-right align-top font-mono tabular-nums sm:px-5 ${trendClass(
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
