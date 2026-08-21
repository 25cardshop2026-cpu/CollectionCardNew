import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardArt } from "@/components/CardArt";
import { Chip } from "@/components/Chip";
import { Sparkline } from "@/components/Sparkline";
import { formatAge, formatBaht, formatPercent, trendClass } from "@/lib/format";
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
  const variants = getVariants(card.id);
  const top = variants
    .map((v) => getCurrentPrice(v.id, "NM"))
    .filter((p) => p !== null)
    .sort((a, b) => b.priceThb - a.priceThb)[0];

  const price = top ? formatBaht(top.priceThb) : "ยังไม่มีข้อมูลราคา";

  return {
    title: `${card.number} ${card.nameTh} — ราคาล่าสุด ${price}`,
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

  // เลือก variant ที่แพงที่สุดมาเป็นตัวขึ้นกราฟ เพราะเป็นตัวที่คนเข้ามาดู
  const headlineVariant =
    [...variants].sort(
      (a, b) =>
        (getCurrentPrice(b.id, "NM")?.priceThb ?? 0) -
        (getCurrentPrice(a.id, "NM")?.priceThb ?? 0),
    )[0] ?? variants[0];

  const headlinePrice = getCurrentPrice(headlineVariant.id, "NM");
  const history = getHistory(headlineVariant.id);

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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="font-mono text-[11.5px] text-ink-3">
        <Link href="/" className="hover:text-accent">
          หน้าแรก
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/g/${set.gameSlug}`} className="hover:text-accent">
          {set.gameSlug === "one-piece" ? "One Piece" : "Pokémon"}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/g/${set.gameSlug}/${set.code.toLowerCase()}`}
          className="hover:text-accent"
        >
          {set.code}
        </Link>
        <span className="mx-2">/</span>
        <span>{card.number}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="flex flex-col gap-3">
          <CardArt
            card={card}
            variantType={headlineVariant.variantType}
            className="max-w-[240px]"
          />
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="accent">{card.rarity}</Chip>
            <Chip>{card.cardType}</Chip>
            <Chip>{card.color}</Chip>
            <Chip>{set.language}</Chip>
          </div>
        </div>

        <div className="flex flex-col gap-7">
          <header className="flex flex-col gap-1.5">
            <span className="font-mono text-[12px] text-ink-3">{card.number}</span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {card.nameTh}
            </h1>
            <p className="text-ink-2">
              {card.nameEn} · {set.nameTh} ({set.code})
            </p>
          </header>

          {headlinePrice && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                {VARIANT_LABEL[headlineVariant.variantType]} · สภาพ NM
              </span>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-4xl font-bold tracking-tight tabular-nums">
                  {formatBaht(headlinePrice.priceThb)}
                </span>
                <span
                  className={`font-mono text-[14px] tabular-nums ${trendClass(
                    headlinePrice.change7d,
                  )}`}
                >
                  {formatPercent(headlinePrice.change7d)} / 7 วัน
                </span>
              </div>
              <span className="text-[12.5px] text-ink-3">
                อัปเดต {formatAge(headlinePrice.updatedAt)}
              </span>
            </div>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              ราคาย้อนหลัง 90 วัน
            </h2>
            <div className="rounded-lg border border-line bg-surface p-4">
              <Sparkline
                points={history}
                label={`กราฟราคาย้อนหลัง 90 วันของ ${card.nameTh} ${VARIANT_LABEL[headlineVariant.variantType]}`}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
              ราคาแยกตามเวอร์ชันและสภาพ
            </h2>
            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-3 py-2 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                      Variant
                    </th>
                    {CONDITIONS.map((condition) => (
                      <th
                        key={condition}
                        className="px-3 py-2 text-right font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3"
                      >
                        {condition}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.map(({ variant, prices }) => (
                    <tr key={variant.id} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {VARIANT_LABEL[variant.variantType]}
                      </td>
                      {prices.map((price, i) => (
                        <td
                          key={CONDITIONS[i]}
                          className="px-3 py-2 text-right font-mono tabular-nums text-ink-2 whitespace-nowrap"
                        >
                          {price ? formatBaht(price.priceThb) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-ink-3">
              ราคาผูกกับเวอร์ชันการ์ดและสภาพ ไม่ใช่ผูกกับตัวการ์ด — การ์ดเกรด PSA/BGS
              จะเป็นตลาดแยกที่เพิ่มในเฟสถัดไป
            </p>
          </section>
        </div>
      </div>

      {siblings.length > 0 && (
        <section className="flex flex-col gap-4 border-t border-line pt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            การ์ดอื่นในชุด {set.code}
          </h2>
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {siblings.map(({ card: sibling, headline }) => (
              <li key={sibling.id}>
                <Link href={`/card/${sibling.slug}`} className="group flex flex-col gap-1.5">
                  <CardArt card={sibling} />
                  <span className="font-mono text-[10.5px] text-ink-3">
                    {sibling.number}
                  </span>
                  <span className="text-[12px] leading-tight group-hover:text-accent">
                    {sibling.nameTh}
                  </span>
                  <span className="font-mono text-[11.5px] tabular-nums text-ink-2">
                    {headline ? formatBaht(headline.priceThb) : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
