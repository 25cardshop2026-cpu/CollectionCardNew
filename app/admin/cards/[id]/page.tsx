import Link from "next/link";
import { notFound } from "next/navigation";
import { CardForm } from "@/components/admin/CardForm";
import { getCardById, listAllSets } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

      <CardForm sets={listAllSets()} card={card} />
    </div>
  );
}
