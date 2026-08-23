import Link from "next/link";
import { notFound } from "next/navigation";
import { CardForm } from "@/components/admin/CardForm";
import { CardImageForm } from "@/components/admin/CardImageForm";
import { getCardById, listAllSets, loadState } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function EditCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; uploaded?: string; removed?: string }>;
}) {
  const { id } = await params;
  await loadState();
  const { error, uploaded, removed } = await searchParams;
  const card = getCardById(decodeURIComponent(id));
  if (!card) notFound();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight">แก้ไขการ์ด</h2>
        <p className="text-[13.5px] text-ink-2">
          ราคาแก้ที่{" "}
          <Link href={`/admin/prices?set=${card.setCode}`} className="text-accent hover:underline">
            หน้าอัปเดตราคา
          </Link>{" "}
          เพราะทุกครั้งที่บันทึกราคาจะเก็บเป็นประวัติแยกแถว
        </p>
      </header>

      {error && (
        <p className="rounded-[4px] border border-down/50 bg-down/5 px-3 py-2 text-[13px] text-down">
          {error}
        </p>
      )}

      {(uploaded || removed) && (
        <p className="rounded-[4px] border border-up/50 bg-up/5 px-3 py-2 text-[13px] text-up">
          {uploaded ? "อัปโหลดรูปแล้ว — ขึ้นบนหน้าเว็บทันที" : "ลบรูปแล้ว"}
        </p>
      )}

      <CardImageForm card={card} />

      <CardForm sets={listAllSets()} card={card} />
    </div>
  );
}
