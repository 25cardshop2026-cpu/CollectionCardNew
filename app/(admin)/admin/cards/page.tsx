import Link from "next/link";
import { deleteCardAction } from "@/lib/actions";
import { formatBaht } from "@/lib/format";
import { listAllSets, listCardsInSet, loadState } from "@/lib/repo";
import { VARIANT_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    set?: string;
    added?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { set: requested, added, saved, deleted, error } = await searchParams;
  await loadState();

  const sets = listAllSets();
  const active = sets.find((s) => s.code === requested) ?? sets[0];
  const rows = active ? listCardsInSet(active.code) : [];

  const notice = added
    ? `เพิ่มการ์ด ${added} แล้ว — เปิดหน้าเว็บดูได้เลย`
    : saved
      ? `บันทึกการแก้ไข ${saved} แล้ว`
      : deleted
        ? `ลบการ์ด ${deleted} แล้ว`
        : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight">จัดการการ์ด</h2>
          <p className="max-w-[62ch] text-[13.5px] text-ink-2">
            การ์ดที่เพิ่มที่นี่จะขึ้นบนหน้าเว็บสาธารณะทันทีที่บันทึก
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/sets/new`}
            className="rounded-[4px] border border-line-strong px-3 py-1.5 text-[13px] hover:border-accent hover:text-accent"
          >
            + เพิ่มชุด
          </Link>
          <Link
            href={`/admin/cards/new${active ? `?set=${active.code}` : ""}`}
            className="rounded-[4px] border border-accent bg-accent px-3 py-1.5 text-[13px] font-bold text-on-accent"
          >
            + เพิ่มการ์ด
          </Link>
        </div>
      </header>

      {error && (
        <p className="rounded-[4px] border border-down/50 bg-down/5 px-3 py-2 text-[13px] text-down">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-[4px] border border-up/50 bg-up/5 px-3 py-2 text-[13px] text-up">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-y border-line py-3">
        <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
          ชุด
        </span>
        {sets.map((set) => (
          <Link
            key={set.code}
            href={`/admin/cards?set=${set.code}`}
            className={`rounded-[3px] border px-2 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.06em] ${
              set.code === active?.code
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-ink-2 hover:border-accent hover:text-accent"
            }`}
          >
            {set.code}
          </Link>
        ))}
      </div>

      {!active ? (
        <p className="text-ink-3">ยังไม่มีชุดในระบบ เริ่มจากกด “เพิ่มชุด” ก่อน</p>
      ) : (
        <>
          <p className="font-mono text-[12px] text-ink-3">
            {active.code} · {active.nameTh} — มีในฐานข้อมูล {rows.length}/{active.totalCards} ใบ
          </p>

          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-line">
                  {["เลขการ์ด", "ชื่อ", "Rarity", "เวอร์ชัน", "ราคา NM", ""].map((head, i) => (
                    <th
                      key={head || i}
                      className={`px-3 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3 ${
                        i === 4 ? "text-right" : "text-left"
                      }`}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ card, variants, headline }) => (
                  <tr key={card.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                    <td className="px-3 py-2 font-mono text-[12px] text-ink-3 whitespace-nowrap">
                      {card.number}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/card/${card.slug}`} className="hover:text-accent">
                        {card.nameTh}
                      </Link>
                      <span className="ml-2 text-[12px] text-ink-3">{card.nameEn}</span>
                    </td>
                    <td className="px-3 py-2 text-ink-2 whitespace-nowrap">{card.rarity}</td>
                    <td className="px-3 py-2 text-[12px] text-ink-3 whitespace-nowrap">
                      {variants.map((v) => VARIANT_LABEL[v.variantType]).join(" · ")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-2 whitespace-nowrap">
                      {headline ? formatBaht(headline.priceThb) : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        {card.sourceUrl && (
                          <a
                            href={card.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12.5px] text-accent hover:underline"
                          >
                            ต้นทาง ↗
                          </a>
                        )}
                        <Link
                          href={`/admin/cards/${card.id}`}
                          className="text-[12.5px] text-ink-3 hover:text-accent"
                        >
                          แก้ไข
                        </Link>
                        <form action={deleteCardAction}>
                          <input type="hidden" name="id" value={card.id} />
                          <input type="hidden" name="setCode" value={active.code} />
                          <button
                            type="submit"
                            className="text-[12.5px] text-ink-3 hover:text-down"
                          >
                            ลบ
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <p className="text-ink-3">ชุดนี้ยังไม่มีการ์ด กด “เพิ่มการ์ด” เพื่อเริ่ม</p>
          )}
        </>
      )}
    </div>
  );
}
