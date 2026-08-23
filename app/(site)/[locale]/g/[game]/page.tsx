import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/Chip";
import { gameTagline, setName, setNameAlt } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { getGame, listCardsInSet, listSets, loadState } from "@/lib/repo";

// อ่านข้อมูลสดทุกครั้ง เพื่อให้ชุดหรือการ์ดที่เพิ่มในแดชบอร์ดขึ้นทันที
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; game: string }>;
}): Promise<Metadata> {
  const { locale, game: gameSlug } = await params;
  await loadState();
  if (!isLocale(locale)) return {};

  const game = getGame(gameSlug);
  if (!game) return {};

  const t = getDictionary(locale);
  return {
    title: t.game.title(game.nameEn),
    description: t.game.description(game.nameEn),
    alternates: {
      languages: { th: `/th/g/${gameSlug}`, en: `/en/g/${gameSlug}` },
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ locale: string; game: string }>;
}) {
  const { locale, game: gameSlug } = await params;
  await loadState();
  if (!isLocale(locale)) notFound();

  const game = getGame(gameSlug);
  if (!game) notFound();

  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const sets = listSets(game.slug);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-12 sm:px-8 sm:py-16">
      <nav className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
        <Link href={p("/")} className="transition-colors hover:text-accent">
          {t.nav.home}
        </Link>
        <span className="mx-2.5 text-line-strong">/</span>
        <span className="text-ink-2">{game.nameEn}</span>
      </nav>

      <header className="flex flex-col gap-4">
        <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em]">
          {game.nameEn}
        </h1>
        <div className="accent-rule h-px w-24" aria-hidden="true" />
        <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{gameTagline(game, locale)}</p>
      </header>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => {
          // นับเลขการ์ดที่มีในระบบ ไม่ใช่จำนวนใบ เพราะใบพิเศษใช้เลขเดิม
          // ถ้านับใบจะเกิน 100% ของชุดทันทีที่มีอาร์ตพิเศษ
          const inDb = new Set(listCardsInSet(set.code).map((row) => row.card.number)).size;
          const pct = set.totalCards > 0 ? Math.round((inDb / set.totalCards) * 100) : 0;

          return (
            <li key={set.code}>
              <Link
                href={p(`/g/${game.slug}/${set.code.toLowerCase()}`)}
                className="group vitrine hud flex h-full flex-col gap-5 p-6 transition-all duration-300 hover:border-accent-line hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <Chip tone="accent">{set.code}</Chip>
                  <Chip tone="quiet">{set.language}</Chip>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h2 className="font-display text-[19px] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-accent">
                    {setName(set, locale)}
                  </h2>
                  <p className="text-[13px] text-ink-3">{setNameAlt(set, locale)}</p>
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  <div className="hairline" />
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
                        {t.game.inDb}
                      </span>
                      <span className="font-mono text-[15px] tabular-nums">
                        {inDb}
                        <span className="text-ink-3">/{set.totalCards}</span>
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-ink-3">
                      {formatDate(set.releaseDate, locale)}
                    </span>
                  </div>

                  <div
                    className="h-[3px] overflow-hidden rounded-full bg-surface-3"
                    role="img"
                    aria-label={t.game.progressLabel(pct)}
                  >
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-500"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {sets.length === 0 && <p className="text-ink-3">{t.game.empty}</p>}
    </div>
  );
}
