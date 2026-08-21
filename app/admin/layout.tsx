import Link from "next/link";
import { IS_DEMO_MODE } from "@/lib/repo";

export const metadata = {
  title: "แดชบอร์ด",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
        <h1 className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
          แดชบอร์ด
        </h1>
        <nav className="flex gap-4 text-[13.5px] text-ink-2">
          <Link href="/admin" className="hover:text-ink">
            ภาพรวม
          </Link>
          <Link href="/admin/prices" className="hover:text-ink">
            อัปเดตราคา
          </Link>
        </nav>
        <Link href="/" className="ml-auto text-[13px] text-ink-3 hover:text-accent">
          ← กลับหน้าเว็บ
        </Link>
      </div>

      {IS_DEMO_MODE && (
        <div className="rounded-lg border border-down/40 bg-down/5 px-4 py-3 text-[13px] text-ink-2">
          <b className="text-ink">โหมดสาธิต — ยังไม่ได้ต่อฐานข้อมูล</b> ราคาที่แก้ไขจะเก็บใน
          หน่วยความจำของเซิร์ฟเวอร์เท่านั้น และหายเมื่อ instance ถูกรีไซเคิล
          ตั้งค่า <code className="font-mono text-[12px]">DATABASE_URL</code> แล้วเขียน adapter
          ใน <code className="font-mono text-[12px]">lib/repo.ts</code> เพื่อใช้งานจริง
        </div>
      )}

      {children}
    </div>
  );
}
