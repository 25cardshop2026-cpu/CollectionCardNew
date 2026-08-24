import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardArt } from "@/components/CardArt";
import { PriceTag } from "@/components/Chip";
import { SearchBox } from "@/components/SearchBox";
import { cardName, cardNameAlt } from "@/lib/display";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { loadState, searchCards } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = getDictionary(locale);
  // หน้าผลค้นหาไม่ควรถูกเก็บเข้าดัชนี เพราะเนื้อหาซ้ำกับหน้าการ์ดจริง
  return { title: t.search.title, robots: { index: false, follow: true } };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  await loadState();
  const { q } = await searchParams;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const query = (q ?? "").trim();
  const results = searchCards(query);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-4">
        <p className="eyebrow">{t.search.title}</p>
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em]">
          {t.search.heading}
        </h1>
        <div className="accent-rule h-px w-24" aria-hidden="true" />
        <SearchBox
          action={p("/search")}
          locale={locale}
          defaultValue={query}
          placeholder={t.search.placeholder}
          submitLabel={t.search.submit}
        />
      </header>

      {query.length < 2 ? (
        <p className="text-[14px] text-ink-3">{t.search.hint}</p>
      ) : results.length === 0 ? (
        <p className="text-[14px] text-ink-3">{t.search.noResults(query)}</p>
      ) : (
        <>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-ink-3">
            {t.search.found(results.length)}
          </p>

          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {results.map(({ card, set, headline }) => (
              <li key={card.id}>
                <Link href={p(`/card/${card.slug}`)} className="group flex flex-col gap-3">
                  <CardArt card={card} />
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3">
                      {card.number} · {set.code}
                    </span>
                    {card.variantType !== "normal" && (
                      <span className="font-mono text-[9.5px] tracking-[0.12em] text-accent uppercase">
                        {t.variant[card.variantType]}
                      </span>
                    )}
                    <span className="text-[13.5px] leading-snug transition-colors group-hover:text-accent">
                      {cardName(card, locale)}
                    </span>
                    <span className="truncate text-[11.5px] text-ink-3">
                      {cardNameAlt(card, locale)}
                    </span>
                    <PriceTag
                      priceThb={headline?.priceThb ?? null}
                      change7d={headline?.change7d ?? null}
                      size="sm"
                      locale={locale}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
