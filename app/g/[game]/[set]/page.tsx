import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardArt } from "@/components/CardArt";
import { Chip, PriceTag } from "@/components/Chip";
import { formatDate } from "@/lib/format";
import { getGame, getSetBySlug, listCardsInSet } from "@/lib/repo";
import { VARIANT_LABEL } from "@/lib/types";

type SortKey = "number" | "price" | "change";

// อ่านข้อมูลสดทุกครั้ง เพื่อให้การ์ดที่เพิ่มในแดชบอร์ดขึ้นทันที
export const dynamic = "force-dynamic";

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
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16">
      <nav className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        <Link href="/" className="transition-colors hover:text-gold">
          หน้าแรก
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <Link href={`/g/${game.slug}`} className="transition-colors hover:text-gold">
          {game.nameEn}
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <span className="text-ink-2">{set.code}</span>
      </nav>

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="gold">{set.code}</Chip>
          <Chip tone="quiet">{set.language}</Chip>
          <span className="font-mono text-[11px] text-ink-3">
            วางจำหน่าย {formatDate(set.releaseDate)}
          </span>
        </div>
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em]">
          {set.nameTh}
        </h1>
        <p className="text-[15px] text-ink-2">{set.nameEn}</p>
      </header>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-2/60 p-4 sm:flex-row sm:items-center sm:gap-8">
        <FilterRow label="Rarity">
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
        </FilterRow>

        <FilterRow label="เรียงตาม">
          <FilterLink href={filterHref({ sort: "" })} active={sortKey === "number"}>
            เลขการ์ด
          </FilterLink>
          <FilterLink href={filterHref({ sort: "price" })} active={sortKey === "price"}>
            ราคาสูงสุด
          </FilterLink>
          <FilterLink href={filterHref({ sort: "change" })} active={sortKey === "change"}>
            ขยับแรง
          </FilterLink>
        </FilterRow>
      </div>

      <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map(({ card, variants, headline }) => {
          const special = variants.find((v) => v.variantType !== "normal");

          return (
            <li key={card.id}>
              <Link href={`/card/${card.slug}`} className="group flex flex-col gap-3">
                <CardArt card={card} />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13.5px] leading-snug transition-colors group-hover:text-gold">
                    {card.nameTh}
                  </span>
                  <PriceTag
                    priceThb={headline?.priceThb ?? null}
                    change7d={headline?.change7d ?? null}
                    size="sm"
                  />
                  {special && (
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-gold">
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
        <p className="py-12 text-center text-ink-3">ไม่มีการ์ดที่ตรงกับตัวกรองนี้</p>
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
          ? "border-gold-line bg-gold-soft text-gold"
          : "border-line-strong text-ink-2 hover:border-gold-line hover:text-gold"
      }`}
    >
      {children}
    </Link>
  );
}
