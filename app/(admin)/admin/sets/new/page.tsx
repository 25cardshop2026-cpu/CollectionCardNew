import { SetForm } from "@/components/admin/SetForm";
import { listGames } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function NewSetPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight">เพิ่มชุด</h2>
        <p className="max-w-[62ch] text-[13.5px] text-ink-2">
          ชุดเดียวกันแต่คนละภาษาให้สร้างแยกกัน เพราะเป็นคนละตลาดและคนละราคา
        </p>
      </header>

      <SetForm games={listGames()} />
    </div>
  );
}
