import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardArt } from "@/components/CardArt";
import { Chip } from "@/components/Chip";
import { formatBaht, formatDate, formatPercent, trendClass } from "@/lib/format";
import { getGame, getSetBySlug, listCardsInSet, listGames, listSets } from "@/lib/repo";
import { VARIANT_LABEL } from "@/lib/types";

type SortKey = "number" | "price" | "change";

export function generateStaticParams() {
  return listGames().flatMap((game) =>
    listSets(game.slug).map((set) => ({
      game: game.slug,
      set: set.code.toLowerCase(),
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string; set: string }>;
}): Promise<Metadata> {
  const { game: gameSlug, set: setSlug } = await params;
  const set = getSetBySlug(gameSlug, setSlug);
  if (!set) return {};

  return {
    title: `${set.code} ${set.nameTh} — ราคาการ์ดทั้งชุด`,
    description: `ราคาการ์ดในชุด ${set.code} ${set.nameEn} ทุกใบ อัปเดตล่าสุด แยกตามเวอร์ชันและสภาพการ์ด`,
  };
}

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string; set: string }>;
  searchParams: Promise<{ rarity?: string; sort?: string }>;
}) {
  const { game: gameSlug, set: setSlug } = await params;
  const { rarity, sort } = await searchParams;

  const game = getGame(gameSlug);
  const set = getSetBySlug(gameSlug, setSlug);
  if (!game || !set) notFound();

  const all = listCardsInSet(set.code);
  const rarities = [...new Set(all.map((row) => row.card.rarity))];

  const sortKey: SortKey =
    sort === "price" || sort === "change" ? sort : "number";

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

  const base = `/g/${game.slug}/${setSlug}`;
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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-8">
      <nav className="font-mono text-[11.5px] text-ink-3">
        <Link href="/" className="hover:text-accent">
          หน้าแรก
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/g/${game.slug}`} className="hover:text-accent">
          {game.nameEn}
        </Link>
        <span className="mx-2">/</span>
        <span>{set.code}</span>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="accent">{set.code}</Chip>
          <Chip>{set.language}</Chip>
          <span className="font-mono text-[11.5px] text-ink-3">
            วางจำหน่าย {formatDate(set.releaseDate)}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{set.nameTh}</h1>
        <p className="text-ink-2">{set.nameEn}</p>
      </header>

      <div className="flex flex-col gap-3 border-y border-line py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3 mr-1">
            Rarity
          </span>
          <FilterLink href={filterHref({ rarity: "" })} active={!rarity}>
            ทั้งหมด
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3 mr-1">
            เรียงตาม
          </span>
          <FilterLink href={filterHref({ sort: "" })} active={sortKey === "number"}>
            เลขการ์ด
          </FilterLink>
          <FilterLink href={filterHref({ sort: "price" })} active={sortKey === "price"}>
            ราคาสูงสุด
          </FilterLink>
          <FilterLink href={filterHref({ sort: "change" })} active={sortKey === "change"}>
            ราคาขยับแรง
          </FilterLink>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map(({ card, variants, headline }) => {
          const special = variants.find((v) => v.variantType !== "normal");

          return (
            <li key={card.id}>
              <Link href={`/card/${card.slug}`} className="group flex flex-col gap-2">
                <CardArt
                  card={card}
                  variantType={special?.variantType ?? "normal"}
                  className="transition-transform group-hover:-translate-y-0.5"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[11px] text-ink-3">{card.number}</span>
                  <span className="text-[13px] leading-tight group-hover:text-accent">
                    {card.nameTh}
                  </span>
                  <span className="flex items-baseline justify-between gap-2 font-mono text-[12px] tabular-nums">
                    <span className="text-ink-2">
                      {headline ? formatBaht(headline.priceThb) : "—"}
                    </span>
                    <span className={trendClass(headline?.change7d ?? null)}>
                      {formatPercent(headline?.change7d ?? null)}
                    </span>
                  </span>
                  {special && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-accent">
                      มี {VARIANT_LABEL[special.variantType]}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && (
        <p className="text-ink-3">ไม่มีการ์ดที่ตรงกับตัวกรองนี้</p>
      )}
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
      className={`rounded-[3px] border px-2 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.06em] ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line-strong text-ink-2 hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </Link>
  );
}
