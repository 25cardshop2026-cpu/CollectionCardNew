import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardArt } from "@/components/CardArt";
import { Chip, PriceTag } from "@/components/Chip";
import { Sparkline } from "@/components/Sparkline";
import { formatAge, formatBaht, formatPercent, trendClass } from "@/lib/format";
import { TIER_LABEL, rarityTier } from "@/lib/rarity";
import {
  getCardBySlug,
  getCurrentPrice,
  getHistory,
  getPriceTable,
  getSet,
  getVariants,
  listCardsInSet,
} from "@/lib/repo";
import { CONDITIONS, VARIANT_LABEL } from "@/lib/types";

// อ่านข้อมูลสดทุกครั้ง เพื่อให้การ์ดที่เพิ่มหรือแก้ในแดชบอร์ดขึ้นทันที
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = getCardBySlug(slug);
  if (!card) return {};

  const set = getSet(card.setCode);
  const top = getVariants(card.id)
    .map((v) => getCurrentPrice(v.id, "NM"))
    .filter((p) => p !== null)
    .sort((a, b) => b.priceThb - a.priceThb)[0];

  return {
    title: `${card.number} ${card.nameTh} — ราคาล่าสุด ${top ? formatBaht(top.priceThb) : "ยังไม่มีข้อมูล"}`,
    description: `ราคาการ์ด ${card.nameTh} (${card.nameEn}) ${card.number} จากชุด ${set?.code} แยกตามเวอร์ชันและสภาพการ์ด พร้อมราคาย้อนหลัง 90 วัน`,
  };
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = getCardBySlug(slug);
  if (!card) notFound();

  const set = getSet(card.setCode);
  if (!set) notFound();

  const table = getPriceTable(card.id, CONDITIONS);
  const variants = getVariants(card.id);
  const tier = rarityTier(card.rarity);

  // เลือก variant ที่แพงที่สุดมาขึ้นกราฟ เพราะเป็นตัวที่คนเข้ามาดู
  const headlineVariant =
    [...variants].sort(
      (a, b) =>
        (getCurrentPrice(b.id, "NM")?.priceThb ?? 0) -
        (getCurrentPrice(a.id, "NM")?.priceThb ?? 0),
    )[0] ?? variants[0];

  const headlinePrice = headlineVariant ? getCurrentPrice(headlineVariant.id, "NM") : null;
  const history = headlineVariant ? getHistory(headlineVariant.id) : [];
  const siblings = listCardsInSet(set.code)
    .filter((row) => row.card.id !== card.id)
    .slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${card.nameEn} ${card.number}`,
    category: `${set.nameEn} / ${card.rarity}`,
    ...(headlinePrice && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "THB",
        lowPrice: Math.round(headlinePrice.priceThb * 0.16),
        highPrice: headlinePrice.priceThb,
        offerCount: variants.length * CONDITIONS.length,
      },
    }),
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-12 sm:px-8 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        <Link href="/" className="transition-colors hover:text-gold">
          หน้าแรก
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <Link href={`/g/${set.gameSlug}`} className="transition-colors hover:text-gold">
          {set.gameSlug === "one-piece" ? "One Piece" : "Pokémon"}
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <Link
          href={`/g/${set.gameSlug}/${set.code.toLowerCase()}`}
          className="transition-colors hover:text-gold"
        >
          {set.code}
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <span className="text-ink-2">{card.number}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[300px_1fr]">
        {/* ---------- รูปการ์ด ---------- */}
        <div className="group flex flex-col gap-4">
          <CardArt card={card} className="w-full" />
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="gold">{card.rarity}</Chip>
            <Chip tone="quiet">{TIER_LABEL[tier]}</Chip>
            <Chip tone="quiet">{card.cardType}</Chip>
            <Chip tone="quiet">{card.color}</Chip>
          </div>
        </div>

        {/* ---------- ข้อมูลและราคา ---------- */}
        {/* min-w-0 จำเป็น ไม่งั้นตารางราคาจะดันคอลัมน์ให้กว้างเกินจอ */}
        <div className="flex min-w-0 flex-col gap-12">
          <header className="flex flex-col gap-3">
            <span className="font-mono text-[12px] tracking-[0.08em] text-ink-3">
              {card.number} · {set.nameTh}
            </span>
            <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
              {card.nameTh}
            </h1>
            <p className="text-[15px] text-ink-2">{card.nameEn}</p>
          </header>

          {headlinePrice && headlineVariant && (
            <section className="flex flex-col gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                {VARIANT_LABEL[headlineVariant.variantType]} · สภาพ NM
              </span>
              <div className="flex flex-wrap items-baseline gap-5">
                <span className="font-mono text-[clamp(2.25rem,7vw,3.5rem)] font-medium leading-none tabular-nums tracking-[-0.03em]">
                  {formatBaht(headlinePrice.priceThb)}
                </span>
                <span
                  className={`font-mono text-[16px] tabular-nums ${trendClass(headlinePrice.change7d)}`}
                >
                  {formatPercent(headlinePrice.change7d)}
                  <span className="ml-1.5 text-[12px] text-ink-3">/ 7 วัน</span>
                </span>
              </div>
              <span className="text-[12.5px] text-ink-3">
                อัปเดต {formatAge(headlinePrice.updatedAt)}
              </span>
            </section>
          )}

          <section className="flex min-w-0 flex-col gap-4">
            <p className="eyebrow">ราคาย้อนหลัง 90 วัน</p>
            <div className="vitrine min-w-0 p-6">
              <Sparkline
                points={history}
                label={`กราฟราคาย้อนหลัง 90 วันของ ${card.nameTh}`}
              />
            </div>
          </section>

          <section className="flex min-w-0 flex-col gap-4">
            <p className="eyebrow">ราคาแยกตามเวอร์ชันและสภาพ</p>
            <div className="vitrine min-w-0 overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-5 py-3.5 text-left font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3">
                      Variant
                    </th>
                    {CONDITIONS.map((condition) => (
                      <th
                        key={condition}
                        className="px-5 py-3.5 text-right font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3"
                      >
                        {condition}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.map(({ variant, prices }) => (
                    <tr
                      key={variant.id}
                      className="border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        {VARIANT_LABEL[variant.variantType]}
                        {variant.variantType !== "normal" && (
                          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-gold">
                            foil
                          </span>
                        )}
                      </td>
                      {prices.map((price, i) => (
                        <td
                          key={CONDITIONS[i]}
                          className="whitespace-nowrap px-5 py-3 text-right font-mono tabular-nums text-ink-2"
                        >
                          {price ? formatBaht(price.priceThb) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="max-w-[62ch] text-[12.5px] leading-relaxed text-ink-3">
              ราคาผูกกับเวอร์ชันการ์ดและสภาพ ไม่ใช่ผูกกับตัวการ์ด — การ์ดเกรด PSA และ BGS
              เป็นตลาดแยกอีกชั้น จะเพิ่มในเฟสถัดไป
            </p>
          </section>
        </div>
      </div>

      {siblings.length > 0 && (
        <section className="flex flex-col gap-6 border-t border-line pt-12">
          <p className="eyebrow">การ์ดอื่นในชุด {set.code}</p>
          <ul className="grid grid-cols-3 gap-x-5 gap-y-6 sm:grid-cols-6">
            {siblings.map(({ card: sibling, headline }) => (
              <li key={sibling.id}>
                <Link href={`/card/${sibling.slug}`} className="group flex flex-col gap-2.5">
                  <CardArt card={sibling} />
                  <span className="text-[12.5px] leading-snug transition-colors group-hover:text-gold">
                    {sibling.nameTh}
                  </span>
                  <PriceTag priceThb={headline?.priceThb ?? null} size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
