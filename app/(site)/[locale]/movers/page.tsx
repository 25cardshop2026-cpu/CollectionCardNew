import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/Chip";
import { cardName } from "@/lib/display";
import { formatBaht, formatPercent, trendClass } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { listMovers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = getDictionary(locale);
  return {
    title: t.movers.title,
    description: t.movers.description,
    alternates: { languages: { th: "/th/movers", en: "/en/movers" } },
  };
}

export default async function MoversPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const movers = listMovers(24);

  const headCell =
    "py-4 font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-4">
        <p className="eyebrow">{t.movers.eyebrow}</p>
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em]">
          {t.movers.heading}
        </h1>
        <div className="gold-rule h-px w-24" aria-hidden="true" />
        <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{t.movers.sub}</p>
      </header>

      {/* ชุดกับเวอร์ชันถูกซ่อนบนจอแคบ เพื่อให้คอลัมน์ % ซึ่งเป็นหัวใจของหน้านี้ไม่ตกขอบ */}
      <div className="vitrine min-w-0 overflow-hidden">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-line">
              <th className={`px-3 text-left sm:px-5 ${headCell}`}>{t.movers.colRank}</th>
              <th className={`px-3 text-left sm:px-5 ${headCell}`}>{t.movers.colCard}</th>
              <th className={`hidden px-5 text-left md:table-cell ${headCell}`}>
                {t.movers.colSet}
              </th>
              <th className={`hidden px-5 text-left lg:table-cell ${headCell}`}>
                {t.movers.colVariant}
              </th>
              <th className={`px-3 text-right sm:px-5 ${headCell}`}>{t.movers.colPrice}</th>
              <th className={`px-3 text-right sm:px-5 ${headCell}`}>{t.movers.colChange}</th>
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
                    href={p(`/card/${mover.card.slug}`)}
                    className="flex flex-col gap-0.5 transition-colors hover:text-gold"
                  >
                    <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3">
                      {mover.card.number}
                      <span className="md:hidden"> · {mover.set.code}</span>
                    </span>
                    <span className="leading-snug">{cardName(mover.card, locale)}</span>
                    <span className="text-[11.5px] text-ink-3 lg:hidden">
                      {t.variant[mover.variant.variantType]}
                    </span>
                  </Link>
                </td>
                <td className="hidden whitespace-nowrap px-5 py-3 md:table-cell">
                  <Chip tone="quiet">{mover.set.code}</Chip>
                </td>
                <td className="hidden whitespace-nowrap px-5 py-3 text-[12.5px] text-ink-2 lg:table-cell">
                  {t.variant[mover.variant.variantType]}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right align-top font-mono tabular-nums sm:px-5">
                  {formatBaht(mover.price.priceThb, locale)}
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
