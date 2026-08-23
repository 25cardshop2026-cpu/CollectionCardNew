import Link from "next/link";
import { CardImageForm } from "@/components/admin/CardImageForm";
import { FeaturedForm } from "@/components/admin/FeaturedForm";
import {
  FEATURED_SLOTS,
  getFeaturedCardIds,
  listFeaturedCards,
  loadState,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * ตั้งค่าหน้าแรก — เลือกการ์ดที่จะโชว์ แล้วอัปรูปให้ทั้งสามใบได้ในหน้าเดียว
 *
 * แยกมาเป็นหน้าของตัวเองเพราะเป็นงานที่ทำซ้ำบ่อยเวลาอยากเปลี่ยนหน้าร้าน
 * ถ้าต้องไล่เปิดหน้าแก้ไขทีละใบจะเสียเวลาและหลงว่าใบไหนอยู่บนหน้าแรกกันแน่
 */
export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await loadState();
  const { saved } = await searchParams;

  const pinnedIds = getFeaturedCardIds();
  const shown = listFeaturedCards();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight">ตั้งค่าหน้าแรก</h2>
        <p className="max-w-[62ch] text-[13.5px] text-ink-2">
          เลือกการ์ด {FEATURED_SLOTS} ใบที่จะโชว์บนหน้าแรก แล้วอัปรูปให้แต่ละใบได้จากหน้านี้เลย
          เว้นช่องว่างไว้ = ให้ระบบเลือกใบที่แพงที่สุดให้เอง
        </p>
      </header>

      {saved && (
        <p className="rounded-[4px] border border-up/50 bg-up/5 px-3 py-2 text-[13px] text-up">
          บันทึกการ์ดหน้าแรกแล้ว — เปิดหน้าเว็บดูได้เลย
        </p>
      )}

      <FeaturedForm slots={FEATURED_SLOTS} pinnedIds={pinnedIds} />

      <section className="flex flex-col gap-3">
        <h3 className="font-mono text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
          รูปของการ์ดที่โชว์อยู่ตอนนี้
        </h3>

        {shown.map(({ card }) => (
          <div key={card.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-2 text-[13.5px]">
              <span className="font-mono text-[12px] text-accent">{card.number}</span>
              <span>{card.nameTh}</span>
              <Link
                href={`/admin/cards/${encodeURIComponent(card.id)}`}
                className="ml-auto text-[12.5px] text-ink-3 hover:text-accent"
              >
                แก้ไขข้อมูลการ์ดนี้ →
              </Link>
            </div>
            <CardImageForm card={card} returnTo="/admin/home" />
          </div>
        ))}
      </section>
    </div>
  );
}
