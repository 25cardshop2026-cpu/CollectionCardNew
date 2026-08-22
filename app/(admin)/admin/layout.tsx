import Link from "next/link";
import { fontVariables } from "@/lib/fonts";
import { IS_DEMO_MODE, canPersist } from "@/lib/repo";
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

          {IS_DEMO_MODE && (
            <div className="rounded-lg border border-down/40 bg-down/5 px-4 py-3 text-[13px] text-ink-2">
              {canPersist() ? (
                <>
                  <b className="text-ink">โหมดสาธิต — ยังไม่ได้ต่อฐานข้อมูล</b> ของที่เพิ่มหรือแก้
                  จะบันทึกลงไฟล์ <code className="font-mono text-[12px]">data/overrides.json</code>{" "}
                  บนเครื่องนี้ ใช้ได้จริงตอนพัฒนา แต่ยังไม่เหมาะกับผู้ใช้หลายคนพร้อมกัน
                </>
              ) : (
                <>
                  <b className="text-ink">อ่านได้อย่างเดียว — บันทึกไม่ได้</b> เซิร์ฟเวอร์นี้เขียนดิสก์ไม่ได้
                  (ปกติของโฮสต์แบบ serverless เช่น Vercel)
                  ต้องต่อฐานข้อมูลจริงก่อนจึงจะเพิ่มหรือแก้การ์ดได้
                </>
              )}{" "}
              ขั้นถัดไปคือตั้งค่า <code className="font-mono text-[12px]">DATABASE_URL</code> แล้วเขียน
              adapter ใน <code className="font-mono text-[12px]">lib/repo.ts</code>
            </div>
          )}

          {children}
        </div>
      </body>
    </html>
  );
}
