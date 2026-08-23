import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardArt } from "@/components/CardArt";
import { Chip, PriceTag } from "@/components/Chip";
import { Sparkline } from "@/components/Sparkline";
import { cardName, cardNameAlt, cardTypeLabel, colorLabel, setName } from "@/lib/display";
import { formatAge, formatBaht, formatPercent, trendClass } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { rarityTier } from "@/lib/rarity";
import {
  getCardBySlug,
  getCurrentPrice,
  getHistory,
  getPriceTable,
  getSet,
  getVariants,
  listCardsInSet,
  loadState,
} from "@/lib/repo";
import { CONDITIONS } from "@/lib/types";

// อ่านข้อมูลสดทุกครั้ง เพื่อให้การ์ดที่เพิ่มหรือแก้ในแดชบอร์ดขึ้นทันที
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  await loadState();
  if (!isLocale(locale)) return {};

  const card = getCardBySlug(slug);
  if (!card) return {};

  const t = getDictionary(locale);
  const set = getSet(card.setCode);
  const top = getVariants(card.id)
    .map((v) => getCurrentPrice(v.id, "NM"))
    .filter((p) => p !== null)
    .sort((a, b) => b.priceThb - a.priceThb)[0];

  return {
    title: t.card.title(
      card.number,
      cardName(card, locale),
      top ? formatBaht(top.priceThb, locale) : t.card.noPrice,
    ),
    description: t.card.description(
      card.nameTh,
      card.nameEn,
      card.number,
      set?.code ?? "",
    ),
    alternates: {
      languages: { th: `/th/card/${slug}`, en: `/en/card/${slug}` },
    },
  };
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  await loadState();
  if (!isLocale(locale)) notFound();

  const card = getCardBySlug(slug);
  if (!card) notFound();

  const set = getSet(card.setCode);
  if (!set) notFound();

  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

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
  const psaPrice = headlineVariant ? getCurrentPrice(headlineVariant.id, "PSA10") : null;
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
        // ขอบบนคือใบเกรด PSA 10 เพราะตารางราคารวมคอลัมน์นั้นแล้ว
        highPrice: psaPrice?.priceThb ?? headlinePrice.priceThb,
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
        <Link href={p("/")} className="transition-colors hover:text-accent">
          {t.nav.home}
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <Link href={p(`/g/${set.gameSlug}`)} className="transition-colors hover:text-accent">
          {set.gameSlug === "one-piece" ? "One Piece" : "Pokémon"}
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <Link
          href={p(`/g/${set.gameSlug}/${set.code.toLowerCase()}`)}
          className="transition-colors hover:text-accent"
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
            <Chip tone="accent">{card.rarity}</Chip>
            <Chip tone="quiet">{t.tier[tier]}</Chip>
            <Chip tone="quiet">{cardTypeLabel(card.cardType, t)}</Chip>
            <Chip tone="quiet">{colorLabel(card.color, t)}</Chip>
          </div>
        </div>

        {/* ---------- ข้อมูลและราคา ---------- */}
        {/* min-w-0 จำเป็น ไม่งั้นตารางราคาจะดันคอลัมน์ให้กว้างเกินจอ */}
        <div className="flex min-w-0 flex-col gap-12">
          <header className="flex flex-col gap-3">
            <span className="font-mono text-[12px] tracking-[0.08em] text-ink-3">
              {card.number} · {setName(set, locale)}
            </span>
            <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
              {cardName(card, locale)}
            </h1>
            <p className="text-[15px] text-ink-2">{cardNameAlt(card, locale)}</p>
          </header>

          {headlinePrice && headlineVariant && (
            <section className="flex flex-col gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                {t.variant[headlineVariant.variantType]} · {t.card.conditionNm}
              </span>
              <div className="flex flex-wrap items-baseline gap-5">
                <span className="neon-num font-mono text-[clamp(2.25rem,7vw,3.5rem)] font-medium leading-none tabular-nums tracking-[-0.03em]">
                  {formatBaht(headlinePrice.priceThb, locale)}
                </span>
                <span
                  className={`font-mono text-[16px] tabular-nums ${trendClass(headlinePrice.change7d)}`}
                >
                  {formatPercent(headlinePrice.change7d)}
                  <span className="ml-1.5 text-[12px] text-ink-3">{t.card.per7d}</span>
                </span>
              </div>
              {/* ราคาการ์ดเกรดวางคู่ราคาการ์ดดิบเสมอ เพราะเป็นเลขที่คนสะสม
                  เอาไปตัดสินใจว่าจะส่งเกรดหรือขายดิบ */}
              {psaPrice && (
                <div className="flex flex-wrap items-baseline gap-3 rounded-lg border border-accent-line bg-accent-soft px-3.5 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                    {t.card.psaLabel}
                  </span>
                  <span className="neon-num font-mono text-[19px] font-medium tabular-nums">
                    {formatBaht(psaPrice.priceThb, locale)}
                  </span>
                  <span className="text-[12px] text-ink-3">{t.card.psaNote}</span>
                </div>
              )}

              <span className="text-[12.5px] text-ink-3">
                {t.card.updated} {formatAge(headlinePrice.updatedAt, t, locale)}
              </span>
            </section>
          )}

          <section className="flex min-w-0 flex-col gap-4">
            <p className="eyebrow">{t.card.historyTitle}</p>
            <div className="vitrine hud min-w-0 p-6">
              <Sparkline
                points={history}
                t={t}
                locale={locale}
                label={t.card.historyLabel(cardName(card, locale))}
              />
            </div>
          </section>

          <section className="flex min-w-0 flex-col gap-4">
            <p className="eyebrow">{t.card.priceTableTitle}</p>
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
                        className={`whitespace-nowrap px-5 py-3.5 text-right font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] ${
                          // คอลัมน์การ์ดเกรดต้องอ่านออกทันทีว่าไม่ใช่สภาพการ์ดดิบ
                          condition === "PSA10"
                            ? "border-l border-accent-line bg-accent-soft text-accent"
                            : "text-ink-3"
                        }`}
                      >
                        {t.condition[condition]}
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
                        {t.variant[variant.variantType]}
                        {variant.variantType !== "normal" && (
                          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
                            foil
                          </span>
                        )}
                      </td>
                      {prices.map((price, i) => (
                        <td
                          key={CONDITIONS[i]}
                          className={`whitespace-nowrap px-5 py-3 text-right font-mono tabular-nums ${
                            CONDITIONS[i] === "PSA10"
                              ? "border-l border-accent-line bg-accent-soft font-medium text-accent"
                              : "text-ink-2"
                          }`}
                        >
                          {price ? formatBaht(price.priceThb, locale) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="max-w-[62ch] text-[12.5px] leading-relaxed text-ink-3">
              {t.card.priceNote}
            </p>
          </section>
        </div>
      </div>

      {siblings.length > 0 && (
        <section className="flex flex-col gap-6 border-t border-line pt-12">
          <p className="eyebrow">{t.card.siblings(set.code)}</p>
          <ul className="grid grid-cols-3 gap-x-5 gap-y-6 sm:grid-cols-6">
            {siblings.map(({ card: sibling, headline }) => (
              <li key={sibling.id}>
                <Link href={p(`/card/${sibling.slug}`)} className="group flex flex-col gap-2.5">
                  <CardArt card={sibling} />
                  <span className="text-[12.5px] leading-snug transition-colors group-hover:text-accent">
                    {cardName(sibling, locale)}
                  </span>
                  <PriceTag
                    priceThb={headline?.priceThb ?? null}
                    size="sm"
                    locale={locale}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
