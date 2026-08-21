import Link from "next/link";
import { Chip, Eyebrow } from "@/components/Chip";
import { formatAge, formatBaht, formatPercent, trendClass } from "@/lib/format";
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
  const movers = listMovers(6);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 flex flex-col gap-14">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
          ราคาการ์ดสะสม แยกตามชุด เวอร์ชัน และสภาพการ์ด
        </h1>
        <p className="max-w-[62ch] text-ink-2">
          เลือกเกมเพื่อดูชุดทั้งหมด แล้วเจาะเข้าไปดูราคาปัจจุบันและราคาย้อนหลังของการ์ดแต่ละใบ
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        {games.map((game) => {
          const sets = listSets(game.slug);
          const cards = countCardsInGame(game.slug);
          const updated = getGameLastUpdated(game.slug);

          return (
            <Link
              key={game.slug}
              href={`/g/${game.slug}`}
              className="group flex flex-col justify-between gap-6 rounded-lg border border-line bg-surface p-6 transition-colors hover:border-accent"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold tracking-tight group-hover:text-accent">
                  {game.nameEn}
                </h2>
                <p className="text-[13.5px] text-ink-2">{game.tagline}</p>
              </div>
              <dl className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[12px] text-ink-3 tabular-nums">
                <div className="flex gap-1.5">
                  <dt>การ์ด</dt>
                  <dd className="text-ink-2">{cards.toLocaleString("th-TH")} ใบ</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>ชุด</dt>
                  <dd className="text-ink-2">{sets.length}</dd>
                </div>
                {updated && (
                  <div className="flex gap-1.5">
                    <dt>อัปเดต</dt>
                    <dd className="text-ink-2">{formatAge(updated)}</dd>
                  </div>
                )}
              </dl>
            </Link>
          );
        })}
      </section>

      <section className="flex flex-col gap-5">
        <Eyebrow>ราคาขยับแรงใน 7 วัน</Eyebrow>
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {movers.map((mover) => (
            <li key={mover.variant.id}>
              <Link
                href={`/card/${mover.card.slug}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2"
              >
                <span className="font-mono text-[12px] text-ink-3 w-[92px] shrink-0">
                  {mover.card.number}
                </span>
                <span className="flex-1 min-w-0 truncate text-[14px]">
                  {mover.card.nameTh}
                  <span className="ml-2 text-ink-3 text-[12.5px]">{mover.set.code}</span>
                </span>
                <span className="font-mono text-[13px] tabular-nums text-ink-2">
                  {formatBaht(mover.price.priceThb)}
                </span>
                <span
                  className={`font-mono text-[12.5px] tabular-nums w-[68px] text-right ${trendClass(
                    mover.price.change7d,
                  )}`}
                >
                  {formatPercent(mover.price.change7d)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div>
          <Link href="/movers" className="text-[13.5px] text-accent hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-accent bg-accent-soft p-5 flex flex-col gap-2">
        <Chip tone="accent">กำลังจะมา</Chip>
        <h2 className="text-[15px] font-bold">คอลเลกชันของคุณเอง</h2>
        <p className="max-w-[62ch] text-[13.5px] text-ink-2">
          เฟสถัดไปจะเปิดให้สมัครสมาชิกเพื่อบันทึกการ์ดที่มี ดู % ความสมบูรณ์ของแต่ละชุด
          และติดตามมูลค่าคอลเลกชันย้อนหลัง
        </p>
      </section>
    </div>
  );
}
