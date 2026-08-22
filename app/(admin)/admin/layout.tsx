import Link from "next/link";
import { fontVariables } from "@/lib/fonts";
import { STORAGE_KIND } from "@/lib/repo";
import "../../globals.css";

/**
 * แดชบอร์ดมี root layout ของตัวเอง แยกจากหน้าเว็บสาธารณะ
 * เพราะเป็นเครื่องมือหลังบ้านภาษาไทยอย่างเดียว ไม่ต้องมี prefix ภาษาใน URL
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "แดชบอร์ด · Collection Card",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th-TH" className={fontVariables}>
      <body className="font-sans">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8">
          <div className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
            <h1 className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
              แดชบอร์ด
            </h1>
            <nav className="flex flex-wrap gap-4 text-[13.5px] text-ink-2">
              <Link href="/admin" className="hover:text-ink">
                ภาพรวม
              </Link>
              <Link href="/admin/sets" className="hover:text-ink">
                จัดการชุด
              </Link>
              <Link href="/admin/cards" className="hover:text-ink">
                จัดการการ์ด
              </Link>
              <Link href="/admin/prices" className="hover:text-ink">
                อัปเดตราคา
              </Link>
            </nav>
            <Link href="/th" className="ml-auto text-[13px] text-ink-3 hover:text-accent">
              ← กลับหน้าเว็บ
            </Link>
          </div>

          {STORAGE_KIND === "blob" && (
            <div className="rounded-lg border border-up/40 bg-up/5 px-4 py-3 text-[13px] text-ink-2">
              <b className="text-ink">บันทึกได้ — เก็บใน Vercel Blob</b> ของที่เพิ่มหรือแก้ที่นี่
              จะขึ้นบนหน้าเว็บสาธารณะทันที และอยู่ถาวรแม้เซิร์ฟเวอร์จะรีสตาร์ท
            </div>
          )}

          {STORAGE_KIND === "file" && (
            <div className="rounded-lg border border-down/40 bg-down/5 px-4 py-3 text-[13px] text-ink-2">
              <b className="text-ink">โหมดพัฒนาในเครื่อง</b> ยังไม่ได้ต่อ Vercel Blob
              ของที่เพิ่มหรือแก้จะบันทึกลงไฟล์{" "}
              <code className="font-mono text-[12px]">data/overrides.json</code> บนเครื่องนี้เท่านั้น
            </div>
          )}

          {STORAGE_KIND === "none" && (
            <div className="rounded-lg border border-down/40 bg-down/5 px-4 py-3 text-[13px] text-ink-2">
              <b className="text-ink">อ่านได้อย่างเดียว — บันทึกไม่ได้</b> เซิร์ฟเวอร์นี้เขียนดิสก์ไม่ได้
              และไม่มี <code className="font-mono text-[12px]">BLOB_READ_WRITE_TOKEN</code>{" "}
              ให้ต่อที่เก็บข้อมูล
            </div>
          )}

          {children}
        </div>
      </body>
    </html>
  );
}
