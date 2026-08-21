import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/Chip";
import { formatDate } from "@/lib/format";
import { getGame, listGames, listCardsInSet, listSets } from "@/lib/repo";

export function generateStaticParams() {
  return listGames().map((game) => ({ game: game.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game: gameSlug } = await params;
  const game = getGame(gameSlug);
  if (!game) return {};

  return {
    title: `ชุดการ์ด ${game.nameEn}`,
    description: `รายการชุดการ์ด ${game.nameEn} ทั้งหมด พร้อมจำนวนการ์ดและวันวางจำหน่าย`,
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game: gameSlug } = await params;
  const game = getGame(gameSlug);
  if (!game) notFound();

  const sets = listSets(game.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-8">
      <nav className="font-mono text-[11.5px] text-ink-3">
        <Link href="/" className="hover:text-accent">
          หน้าแรก
        </Link>
        <span className="mx-2">/</span>
        <span>{game.nameEn}</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{game.nameEn}</h1>
        <p className="text-ink-2">{game.tagline}</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => {
          const inDb = listCardsInSet(set.code).length;

          return (
            <li key={set.code}>
              <Link
                href={`/g/${game.slug}/${set.code.toLowerCase()}`}
                className="group flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-center justify-between gap-3">
                  <Chip tone="accent">{set.code}</Chip>
                  <Chip>{set.language}</Chip>
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="font-bold text-[15px] group-hover:text-accent">
                    {set.nameTh}
                  </h2>
                  <p className="text-[12.5px] text-ink-3">{set.nameEn}</p>
                </div>
                <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-ink-3 tabular-nums">
                  <div className="flex gap-1.5">
                    <dt>วางจำหน่าย</dt>
                    <dd className="text-ink-2">{formatDate(set.releaseDate)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>ในฐานข้อมูล</dt>
                    <dd className="text-ink-2">
                      {inDb}/{set.totalCards}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
