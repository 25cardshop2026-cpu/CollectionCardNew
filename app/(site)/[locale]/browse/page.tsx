import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip, Eyebrow, PriceTag } from "@/components/Chip";
import { formatAge, formatNumber } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { cardName } from "@/lib/display";
import {
  countCardsInGame,
  getGameLastUpdated,
  listGames,
  listMovers,
  listSets,
  loadState,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  await loadState();
  if (!isLocale(locale)) return {};

  const t = getDictionary(locale);
  return { title: t.browse.title, description: t.browse.description };
}

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await loadState();
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const games = listGames();
  const movers = listMovers(8);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-5 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-4">
        <Eyebrow>{t.browse.title}</Eyebrow>
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em]">
          {t.browse.heading}
        </h1>
        <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{t.browse.sub}</p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        {games.map((game) => {
          const sets = listSets(game.slug);
          const cards = countCardsInGame(game.slug);
          const updated = getGameLastUpdated(game.slug);

          return (
            <Link
              key={game.slug}
              href={p(`/g/${game.slug}`)}
              className="group vitrine hud relative flex flex-col justify-between gap-10 overflow-hidden p-8 transition-all duration-300 hover:border-accent-line hover:shadow-[var(--shadow-lift)]"
            >
              <div
                className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: "radial-gradient(circle, var(--accent-soft), transparent 70%)" }}
                aria-hidden="true"
              />

              <div className="flex flex-col gap-3">
                <h2 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.01em] transition-colors group-hover:text-accent">
                  {game.nameEn}
                </h2>
                <p className="max-w-[36ch] text-[14px] leading-relaxed text-ink-2">
                  {game.tagline}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="hairline" />
                <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                  <div className="flex flex-col">
                    <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
                      {t.browse.cards}
                    </dt>
                    <dd className="font-mono text-[19px] tabular-nums">
                      {formatNumber(cards, locale)}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
                      {t.browse.sets}
                    </dt>
                    <dd className="font-mono text-[19px] tabular-nums">{sets.length}</dd>
                  </div>
                  {updated && (
                    <div className="ml-auto flex flex-col items-end">
                      <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
                        {t.browse.updated}
                      </dt>
                      <dd className="text-[13px] text-ink-2">
                        {formatAge(updated, t, locale)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="flex flex-col gap-6">
        <Eyebrow>{t.browse.moversTitle}</Eyebrow>

        <ul className="vitrine hud divide-y divide-line overflow-hidden">
          {movers.map((mover, index) => (
            <li key={mover.variant.id}>
              <Link
                href={p(`/card/${mover.card.slug}`)}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:gap-6 sm:px-6"
              >
                <span className="w-5 shrink-0 font-mono text-[12px] tabular-nums text-ink-3">
                  {index + 1}
                </span>
                <span className="hidden w-[92px] shrink-0 font-mono text-[11.5px] text-ink-3 sm:block">
                  {mover.card.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] transition-colors group-hover:text-accent">
                  {cardName(mover.card, locale)}
                </span>
                <span className="hidden shrink-0 sm:block">
                  <Chip tone="quiet">{mover.set.code}</Chip>
                </span>
                <span className="shrink-0">
                  <PriceTag
                    priceThb={mover.price.priceThb}
                    change7d={mover.price.change7d}
                    size="sm"
                    locale={locale}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href={p("/movers")}
          className="self-start font-mono text-[12px] uppercase tracking-[0.14em] text-accent hover:underline"
        >
          {t.browse.seeAll}
        </Link>
      </section>
    </div>
  );
}
