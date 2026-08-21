import Link from "next/link";
import { CardForm } from "@/components/admin/CardForm";
import { listAllSets } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function NewCardPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>;
}) {
  const { set } = await searchParams;
  const sets = listAllSets();

  if (sets.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-bold tracking-tight">เพิ่มการ์ด</h2>
        <p className="text-ink-2">
          ยังไม่มีชุดในระบบ ต้อง{" "}
          <Link href="/admin/sets/new" className="text-gold hover:underline">
            เพิ่มชุดก่อน
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight">เพิ่มการ์ด</h2>
        <p className="max-w-[62ch] text-[13.5px] text-ink-2">
          บันทึกแล้วการ์ดจะขึ้นบนหน้าชุดและหน้าค้นหาของเว็บสาธารณะทันที
        </p>
      </header>

      <CardForm sets={sets} defaultSetCode={set} />
    </div>
  );
}
