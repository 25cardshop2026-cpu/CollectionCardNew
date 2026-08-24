import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CardArt } from "@/components/CardArt";
import { cardName } from "@/lib/display";
import { formatBaht, formatNumber, formatPercent, trendClass } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { listHoldings, type Holding } from "@/lib/portfolio";
import { removeHoldingAction, updateHoldingAction } from "@/lib/portfolio-actions";
import { getCardById, getCurrentPrice, getSet, getVariants, loadState } from "@/lib/repo";
import { currentUser } from "@/lib/session";
import type { Card, CardSet } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = getDictionary(locale);
  // พอร์ตเป็นของส่วนตัว ไม่ควรถูกเก็บเข้าดัชนีของ search engine
  return {
    title: t.portfolio.title,
    description: t.portfolio.description,
    robots: { index: false, follow: false },
  };
}

interface Row {
  holding: Holding;
  card: Card | undefined;
  set: CardSet | undefined;
  /** ราคาล่าสุดต่อใบตามสภาพที่ผู้ใช้บันทึกไว้ */
  priceThb: number | null;
  change7d: number | null;
  /** มูลค่ารวมของแถวนี้ = ราคาต่อใบ × จำนวน */
  value: number | null;
  cost: number | null;
}

export default async function PortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ added?: string; removed?: string; updated?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const user = await currentUser();
  if (!user) redirect(`${p("/login")}?next=${encodeURIComponent(p("/portfolio"))}`);

  const { added, removed, updated, error } = await searchParams;

  await loadState();
  const holdings = await listHoldings(user.id);

  const rows: Row[] = holdings.map((holding) => {
    const card = getCardById(holding.cardId);
    // การ์ดหนึ่งใบ = แบบพิมพ์เดียว ราคาจึงผูกกับ variant ตัวแรกตัวเดียว
    const variant = card ? getVariants(card.id)[0] : undefined;
    const price = variant ? getCurrentPrice(variant.id, holding.condition) : null;

    return {
      holding,
      card,
      set: card ? getSet(card.setCode) : undefined,
      priceThb: price?.priceThb ?? null,
      change7d: price?.change7d ?? null,
      value: price ? price.priceThb * holding.quantity : null,
      cost: holding.costThb !== null ? holding.costThb * holding.quantity : null,
    };
  });

  /*
    กำไรขาดทุนคิดเฉพาะใบที่มีทั้งราคาปัจจุบันและต้นทุน
    ถ้าเอามูลค่ารวมทั้งพอร์ตไปลบต้นทุนที่กรอกไว้แค่บางใบ ตัวเลขที่ได้จะ
    ดูเหมือนกำไรมหาศาลทั้งที่แค่ยังกรอกต้นทุนไม่ครบ
  */
  let totalValue = 0;
  let totalCost = 0;
  let comparableValue = 0;
  let comparableCost = 0;
  let totalCards = 0;

  for (const row of rows) {
    totalCards += row.holding.quantity;
    if (row.value !== null) totalValue += row.value;
    if (row.cost !== null) totalCost += row.cost;
    if (row.value !== null && row.cost !== null) {
      comparableValue += row.value;
      comparableCost += row.cost;
    }
  }

  const gain = comparableCost > 0 ? comparableValue - comparableCost : null;
  const gainPct = gain !== null ? Math.round((gain / comparableCost) * 1000) / 10 : null;

  const notice = added
    ? t.portfolio.added
    : removed
      ? t.portfolio.removed
      : updated
        ? t.portfolio.updated
        : null;

  const inputClass =
    "w-20 rounded-[3px] border border-line-strong bg-surface-2 px-2 py-1 text-right font-mono text-[12.5px] tabular-nums focus:border-accent focus:bg-accent-soft";
  const headClass =
    "px-4 py-3 font-mono text-[9.5px] font-normal uppercase tracking-[0.12em] text-ink-3";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">
          {t.auth.signedInAs} {user.displayName}
        </p>
        <h1 className="font-display text-[clamp(1.9rem,4vw,2.6rem)] font-semibold leading-[1.15] tracking-[-0.02em]">
          {t.portfolio.heading}
        </h1>
        <p className="max-w-[64ch] text-[14px] leading-relaxed text-ink-2">{t.portfolio.sub}</p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-[4px] border border-down/50 bg-down/5 px-3 py-2 text-[13px] text-down"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-[4px] border border-up/50 bg-up/5 px-3 py-2 text-[13px] text-up"
        >
          {notice}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="vitrine hud flex flex-col gap-1.5 p-5">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
            {t.portfolio.statValue}
          </span>
          <span className="neon-num font-mono text-[26px] font-medium tabular-nums">
            {formatBaht(totalValue, locale)}
          </span>
        </div>

        <div className="vitrine flex flex-col gap-1.5 p-5">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
            {t.portfolio.statCost}
          </span>
          <span className="font-mono text-[26px] font-medium tabular-nums text-ink-2">
            {totalCost > 0 ? formatBaht(totalCost, locale) : "—"}
          </span>
        </div>

        <div className="vitrine flex flex-col gap-1.5 p-5">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
            {t.portfolio.statGain}
          </span>
          {gain === null ? (
            <span className="text-[13px] text-ink-3">{t.portfolio.noCostYet}</span>
          ) : (
            <span className={`font-mono text-[26px] font-medium tabular-nums ${trendClass(gain)}`}>
              {gain > 0 ? "+" : ""}
              {formatBaht(gain, locale)}
              <span className="ml-2 text-[13px]">{formatPercent(gainPct)}</span>
            </span>
          )}
        </div>

        <div className="vitrine flex flex-col gap-1.5 p-5">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
            {t.portfolio.statCards}
          </span>
          <span className="font-mono text-[26px] font-medium tabular-nums text-ink-2">
            {formatNumber(totalCards, locale)}
          </span>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="vitrine hud flex flex-col items-start gap-3 p-8">
          <p className="font-display text-[19px] font-semibold">{t.portfolio.empty}</p>
          <p className="text-[13.5px] text-ink-2">{t.portfolio.emptySub}</p>
          <Link href={p("/browse")} className="btn btn-primary btn-sm mt-2">
            {t.portfolio.emptyCta}
          </Link>
        </div>
      ) : (
        <div className="vitrine min-w-0 overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-line">
                <th className={`${headClass} text-left`}>{t.portfolio.colCard}</th>
                <th className={`${headClass} text-left`}>{t.portfolio.colCondition}</th>
                <th className={`${headClass} text-right`}>{t.portfolio.colQty}</th>
                <th className={`${headClass} text-right`}>{t.portfolio.colCost}</th>
                <th className={`${headClass} text-right`}>{t.portfolio.colPrice}</th>
                <th className={`${headClass} text-right`}>{t.portfolio.colValue}</th>
                <th className={headClass} />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ holding, card, set, priceThb, change7d, value }) => {
                // ช่องกรอกอยู่คนละ <td> กับปุ่มบันทึก จึงผูกเข้าฟอร์มด้วย form=
                // แทนการครอบ <form> ซึ่งคร่อมหลายเซลล์ในตารางไม่ได้
                const formId = `holding-${holding.id}`;

                return (
                  <tr
                    key={holding.id}
                    className="border-b border-line last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      {card ? (
                        <Link
                          href={p(`/card/${card.slug}`)}
                          className="group flex items-center gap-3"
                        >
                          <span className="w-10 shrink-0">
                            <CardArt card={card} />
                          </span>
                          <span className="flex flex-col gap-0.5">
                            <span className="transition-colors group-hover:text-accent">
                              {cardName(card, locale)}
                            </span>
                            <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3">
                              {card.number} · {set?.code}
                              {card.variantType !== "normal" &&
                                ` · ${t.variant[card.variantType]}`}
                            </span>
                            {holding.note && (
                              <span className="text-[11.5px] text-ink-3">{holding.note}</span>
                            )}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-[13px] text-down">{t.portfolio.missingCard}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-ink-2">
                      {t.condition[holding.condition]}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <input
                        form={formId}
                        name="quantity"
                        type="number"
                        min={1}
                        max={9999}
                        defaultValue={holding.quantity}
                        aria-label={t.portfolio.colQty}
                        className={`${inputClass} w-16`}
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <input
                        form={formId}
                        name="costThb"
                        inputMode="numeric"
                        placeholder="—"
                        defaultValue={holding.costThb ?? ""}
                        aria-label={t.portfolio.colCost}
                        className={inputClass}
                      />
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {priceThb === null ? (
                        <span className="text-[12.5px] text-ink-3">{t.portfolio.noPrice}</span>
                      ) : (
                        <span className="flex items-baseline justify-end gap-2">
                          <span className="font-mono tabular-nums text-ink-2">
                            {formatBaht(priceThb, locale)}
                          </span>
                          <span
                            className={`font-mono text-[11px] tabular-nums ${trendClass(change7d)}`}
                          >
                            {formatPercent(change7d)}
                          </span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-medium tabular-nums whitespace-nowrap">
                      {value === null ? "—" : formatBaht(value, locale)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <form id={formId} action={updateHoldingAction}>
                          <input type="hidden" name="holdingId" value={holding.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="redirectTo" value={p("/portfolio")} />
                          <button
                            type="submit"
                            className="text-[12.5px] text-ink-3 transition-colors hover:text-accent"
                          >
                            {t.portfolio.save}
                          </button>
                        </form>

                        <form action={removeHoldingAction}>
                          <input type="hidden" name="holdingId" value={holding.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="redirectTo" value={p("/portfolio")} />
                          <button
                            type="submit"
                            className="text-[12.5px] text-ink-3 transition-colors hover:text-down"
                          >
                            {t.portfolio.remove}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
