import Link from "next/link";
import { Chip, Eyebrow, PriceTag } from "@/components/Chip";
import { formatAge } from "@/lib/format";
import {
  countCardsInGame,
  getGameLastUpdated,
  listGames,
  listMovers,
  listSets,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const games = listGames();
  const movers = listMovers(8);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-24 px-5 py-16 sm:px-8 sm:py-24">
      {/* ---------- Hero ---------- */}
      <section className="flex flex-col items-center gap-7 text-center">
        <p className="eyebrow">One Piece · Pokémon</p>
        <h1 className="max-w-[20ch] text-balance font-display text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-[1.12] tracking-[-0.02em]">
          รู้ราคาการ์ดของคุณ ก่อนจะซื้อหรือปล่อย
        </h1>
        <div className="foil-rule h-px w-40" aria-hidden="true" />
        <p className="max-w-[54ch] text-[16px] leading-relaxed text-ink-2">
          ราคาแยกตามชุด เวอร์ชัน และสภาพการ์ดอย่างละเอียด
          พร้อมกราฟย้อนหลังให้เห็นว่าใบไหนกำลังขึ้น ใบไหนกำลังลง
        </p>
      </section>

      {/* ---------- เลือกเกม ---------- */}
      <section className="grid gap-6 sm:grid-cols-2">
        {games.map((game) => {
          const sets = listSets(game.slug);
          const cards = countCardsInGame(game.slug);
          const updated = getGameLastUpdated(game.slug);

          return (
            <Link
              key={game.slug}
              href={`/g/${game.slug}`}
              className="group vitrine relative flex flex-col justify-between gap-10 overflow-hidden p-8 transition-all duration-300 hover:border-gold-line hover:shadow-[var(--shadow-lift)]"
            >
              <div
                className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: "radial-gradient(circle, var(--gold-soft), transparent 70%)" }}
                aria-hidden="true"
              />

              <div className="flex flex-col gap-3">
                <h2 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.01em] transition-colors group-hover:text-gold">
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
                      การ์ด
                    </dt>
                    <dd className="font-mono text-[19px] tabular-nums">
                      {cards.toLocaleString("th-TH")}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
                      ชุด
                    </dt>
                    <dd className="font-mono text-[19px] tabular-nums">{sets.length}</dd>
                  </div>
                  {updated && (
                    <div className="ml-auto flex flex-col items-end">
                      <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
                        อัปเดต
                      </dt>
                      <dd className="text-[13px] text-ink-2">{formatAge(updated)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </Link>
          );
        })}
      </section>

      {/* ---------- ราคาขยับแรง ---------- */}
      <section className="flex flex-col gap-6">
        <Eyebrow>ราคาขยับแรงใน 7 วัน</Eyebrow>

        <ul className="vitrine divide-y divide-line overflow-hidden">
          {movers.map((mover, index) => (
            <li key={mover.variant.id}>
              <Link
                href={`/card/${mover.card.slug}`}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:gap-6 sm:px-6"
              >
                <span className="w-5 shrink-0 font-mono text-[12px] tabular-nums text-ink-3">
                  {index + 1}
                </span>
                <span className="hidden w-[92px] shrink-0 font-mono text-[11.5px] text-ink-3 sm:block">
                  {mover.card.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] transition-colors group-hover:text-gold">
                  {mover.card.nameTh}
                </span>
                <span className="hidden shrink-0 sm:block">
                  <Chip tone="quiet">{mover.set.code}</Chip>
                </span>
                <span className="shrink-0">
                  <PriceTag
                    priceThb={mover.price.priceThb}
                    change7d={mover.price.change7d}
                    size="sm"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/movers"
          className="self-start font-mono text-[12px] uppercase tracking-[0.14em] text-gold hover:underline"
        >
          ดูทั้งหมด →
        </Link>
      </section>

      {/* ---------- กำลังจะมา ---------- */}
      <section className="vitrine flex flex-col items-center gap-4 border-gold-line bg-gold-soft px-8 py-12 text-center">
        <Chip tone="gold">กำลังจะมา</Chip>
        <h2 className="font-display text-[24px] font-semibold tracking-[-0.01em]">
          คอลเลกชันของคุณเอง
        </h2>
        <p className="max-w-[52ch] text-[14.5px] leading-relaxed text-ink-2">
          เฟสถัดไปจะเปิดให้สมัครสมาชิกเพื่อบันทึกการ์ดที่มี ดูว่าเก็บครบชุดไปกี่เปอร์เซ็นต์
          และติดตามมูลค่าคอลเลกชันย้อนหลังได้เหมือนดูพอร์ตลงทุน
        </p>
      </section>
    </div>
  );
}
