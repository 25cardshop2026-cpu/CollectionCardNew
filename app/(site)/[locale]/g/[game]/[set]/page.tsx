import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardArt } from "@/components/CardArt";
import { Chip, PriceTag } from "@/components/Chip";
import { cardName, setName, setNameAlt } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { getGame, getSetBySlug, listCardsInSet, loadState } from "@/lib/repo";

type SortKey = "number" | "price" | "change";

// อ่านข้อมูลสดทุกครั้ง เพื่อให้การ์ดที่เพิ่มในแดชบอร์ดขึ้นทันที
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; game: string; set: string }>;
}): Promise<Metadata> {
  const { locale, game: gameSlug, set: setSlug } = await params;
  await loadState();
  if (!isLocale(locale)) return {};

  const set = getSetBySlug(gameSlug, setSlug);
  if (!set) return {};

  const t = getDictionary(locale);
  const name = setName(set, locale);

  return {
    title: t.set.title(set.code, name),
    description: t.set.description(set.code, name),
    alternates: {
      languages: {
        th: `/th/g/${gameSlug}/${setSlug}`,
        en: `/en/g/${gameSlug}/${setSlug}`,
      },
    },
  };
}

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; game: string; set: string }>;
  searchParams: Promise<{ rarity?: string; sort?: string }>;
}) {
  const { locale, game: gameSlug, set: setSlug } = await params;
  await loadState();
  const { rarity, sort } = await searchParams;
  if (!isLocale(locale)) notFound();

  const game = getGame(gameSlug);
  const set = getSetBySlug(gameSlug, setSlug);
  if (!game || !set) notFound();

  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const all = listCardsInSet(set.code);
  const rarities = [...new Set(all.map((row) => row.card.rarity))];
  const sortKey: SortKey = sort === "price" || sort === "change" ? sort : "number";

  const rows = all
    .filter((row) => !rarity || row.card.rarity === rarity)
    .sort((a, b) => {
      if (sortKey === "price") {
        return (b.headline?.priceThb ?? 0) - (a.headline?.priceThb ?? 0);
      }
      if (sortKey === "change") {
        return Math.abs(b.headline?.change7d ?? 0) - Math.abs(a.headline?.change7d ?? 0);
      }
      return a.card.number.localeCompare(b.card.number);
    });

  const base = p(`/g/${game.slug}/${setSlug}`);
  const filterHref = (next: { rarity?: string; sort?: string }) => {
    const query = new URLSearchParams();
    const r = next.rarity ?? rarity;
    const s = next.sort ?? (sortKey === "number" ? undefined : sortKey);
    if (r) query.set("rarity", r);
    if (s) query.set("sort", s);
    const qs = query.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16">
      <nav className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        <Link href={p("/")} className="transition-colors hover:text-accent">
          {t.nav.home}
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <Link href={p(`/g/${game.slug}`)} className="transition-colors hover:text-accent">
          {game.nameEn}
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <span className="text-ink-2">{set.code}</span>
      </nav>

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="accent">{set.code}</Chip>
          <Chip tone="quiet">{set.language}</Chip>
          <span className="font-mono text-[11px] text-ink-3">
            {t.set.released} {formatDate(set.releaseDate, locale)}
          </span>
        </div>
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em]">
          {setName(set, locale)}
        </h1>
        <p className="text-[15px] text-ink-2">{setNameAlt(set, locale)}</p>
      </header>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-2/60 p-4 sm:flex-row sm:items-center sm:gap-8">
        <FilterRow label={t.set.rarity}>
          <FilterLink href={filterHref({ rarity: "" })} active={!rarity}>
            {t.set.all}
          </FilterLink>
          {rarities.map((value) => (
            <FilterLink
              key={value}
              href={filterHref({ rarity: value })}
              active={rarity === value}
            >
              {value}
            </FilterLink>
          ))}
        </FilterRow>

        <FilterRow label={t.set.sortBy}>
          <FilterLink href={filterHref({ sort: "" })} active={sortKey === "number"}>
            {t.set.byNumber}
          </FilterLink>
          <FilterLink href={filterHref({ sort: "price" })} active={sortKey === "price"}>
            {t.set.byPrice}
          </FilterLink>
          <FilterLink href={filterHref({ sort: "change" })} active={sortKey === "change"}>
            {t.set.byChange}
          </FilterLink>
        </FilterRow>
      </div>

      <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map(({ card, headline }) => {
          return (
            <li key={card.id}>
              <Link href={p(`/card/${card.slug}`)} className="group flex flex-col gap-3">
                <CardArt card={card} />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13.5px] leading-snug transition-colors group-hover:text-accent">
                    {cardName(card, locale)}
                  </span>
                  <PriceTag
                    priceThb={headline?.priceThb ?? null}
                    change7d={headline?.change7d ?? null}
                    size="sm"
                    locale={locale}
                  />
                  {card.variantType !== "normal" && (
                    <span className="font-mono text-[9.5px] tracking-[0.12em] text-accent uppercase">
                      {t.variant[card.variantType]}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="py-12 text-center text-ink-3">{t.set.empty}</p>
      )}
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
        active
          ? "border-accent-line bg-accent-soft text-accent"
          : "border-line-strong text-ink-2 hover:border-accent-line hover:text-accent"
      }`}
    >
      {children}
    </Link>
  );
}
