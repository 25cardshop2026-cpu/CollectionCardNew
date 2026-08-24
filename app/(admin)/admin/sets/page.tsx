import Link from "next/link";
import {
  deleteSetAction } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import { listAllSets,
  listCardsInSet,
  listGames,
  loadState,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * จัดการชุดการ์ด — เพิ่มและลบ
 *
 * การลบชุดลากการ์ดทั้งชุดหายไปด้วย จึงทำเป็นสองจังหวะ:
 * กด "ลบ" แล้วแถวนั้นจะกลายเป็นคำถามยืนยันพร้อมบอกว่าจะเสียการ์ดกี่ใบ
 * ทำฝั่งเซิร์ฟเวอร์ล้วน ๆ ไม่ต้องพึ่ง confirm() ของเบราว์เซอร์
 */
export default async function AdminSetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    confirm?: string;
    deleted?: string;
    cards?: string;
    error?: string;
  }>;
}) {
  const { confirm, deleted, cards: deletedCards, error } = await searchParams;
  await loadState();

  const games = listGames();
  const sets = listAllSets();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight">จัดการชุด</h2>
          <p className="max-w-[62ch] text-[13.5px] text-ink-2">
            ชุดคือกล่องที่ใส่การ์ด ลบชุดแล้วการ์ดกับราคาทั้งหมดในชุดจะหายตามไปด้วย
          </p>
        </div>
        <Link
          href="/admin/sets/new"
          className="rounded-[4px] border border-accent bg-accent px-3 py-1.5 text-[13px] font-bold text-on-accent"
        >
          + เพิ่มชุด
        </Link>
      </header>

      {error && (
        <p className="rounded-[4px] border border-down/50 bg-down/5 px-3 py-2 text-[13px] text-down">
          {error}
        </p>
      )}

      {deleted && (
        <p className="rounded-[4px] border border-up/50 bg-up/5 px-3 py-2 text-[13px] text-up">
          ลบชุด {deleted} แล้ว
          {deletedCards && deletedCards !== "0" && ` พร้อมการ์ด ${deletedCards} ใบ`}
        </p>
      )}

      {games.map((game) => {
        const rows = sets.filter((set) => set.gameSlug === game.slug);
        if (rows.length === 0) return null;

        return (
          <section key={game.slug} className="flex flex-col gap-3">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
              {game.nameEn}
            </h3>

            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                      รหัส
                    </th>
                    <th className="px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                      ชื่อชุด
                    </th>
                    <th className="px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                      ภาษา
                    </th>
                    <th className="px-3 py-2.5 text-right font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                      การ์ดในระบบ
                    </th>
                    <th className="px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                      วางจำหน่าย
                    </th>
                    <th className="px-3 py-2.5 text-right font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((set) => {
                    const inDb = listCardsInSet(set.code).length;
                    const confirming = confirm === set.code;

                    return (
                      <tr
                        key={set.code}
                        className={`border-b border-line last:border-0 ${
                          confirming ? "bg-down/5" : "hover:bg-surface-2"
                        }`}
                      >
                        <td className="px-3 py-2 font-mono text-[12px] whitespace-nowrap text-accent">
                          {set.code}
                        </td>
                        <td className="px-3 py-2">
                          <span className="block whitespace-nowrap">{set.nameTh}</span>
                          <span className="block text-[12px] whitespace-nowrap text-ink-3">
                            {set.nameEn}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px] text-ink-2">
                          {set.language}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                          {inDb}
                          <span className="text-ink-3">/{set.totalCards}</span>
                        </td>
                        <td className="px-3 py-2 text-[12.5px] whitespace-nowrap text-ink-2">
                          {formatDate(set.releaseDate, "th")}
                        </td>
                        <td className="px-3 py-2">
                          {confirming ? (
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              <span className="text-[12.5px] text-down">
                                {inDb > 0
                                  ? `ลบชุดนี้พร้อมการ์ด ${inDb} ใบและราคาทั้งหมด?`
                                  : "ลบชุดนี้?"}
                              </span>
                              <form action={deleteSetAction}>
                                <input type="hidden" name="code" value={set.code} />
                                <button
                                  type="submit"
                                  className="rounded-[3px] border border-down px-2 py-[3px] text-[12.5px] text-down hover:bg-down hover:text-bg"
                                >
                                  ยืนยันลบ
                                </button>
                              </form>
                              <Link
                                href="/admin/sets"
                                className="text-[12.5px] text-ink-3 hover:text-ink"
                              >
                                ยกเลิก
                              </Link>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-3">
                              <Link
                                href={`/admin/cards?set=${set.code}`}
                                className="text-[12.5px] text-ink-3 hover:text-accent"
                              >
                                การ์ด · ราคา
                              </Link>
                              <Link
                                href={`/admin/sets?confirm=${set.code}`}
                                className="text-[12.5px] text-ink-3 hover:text-down"
                              >
                                ลบ
                              </Link>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {sets.length === 0 && (
        <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-[13.5px] text-ink-3">
          ยังไม่มีชุดในระบบ — กด “เพิ่มชุด” เพื่อเริ่ม
        </p>
      )}
    </div>
  );
}
