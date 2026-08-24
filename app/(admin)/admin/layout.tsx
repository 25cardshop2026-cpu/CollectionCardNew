import Link from "next/link";
import { redirect } from "next/navigation";
import { NavLink } from "@/components/NavLink";
import { fontVariables } from "@/lib/fonts";
import { STORAGE_KIND } from "@/lib/repo";
import { currentUser } from "@/lib/session";
import { adminConfigured } from "@/lib/users";
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

/**
 * กันคนนอกออกจากแดชบอร์ดทั้งก้อนที่ layout ชั้นเดียว
 *
 * ทุกหน้าใน (admin) อยู่ใต้ layout นี้ จึงกันได้ครบในที่เดียวโดยไม่ต้องไล่ใส่
 * ทีละหน้า แต่ layout กันได้แค่ "หน้าจอ" เท่านั้น — server action กับ API
 * ที่แก้ข้อมูลจริงถูกเรียกตรงได้โดยไม่ผ่าน layout จึงต้องกันซ้ำในตัวมันเองด้วย
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) redirect(`/th/login?next=${encodeURIComponent("/admin")}`);

  if (!user.isAdmin) {
    return (
      <html lang="th-TH" className={fontVariables}>
        <body className="font-sans">
          <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
            <h1 className="text-xl font-bold tracking-tight">เข้าแดชบอร์ดไม่ได้</h1>
            <p className="text-[14px] leading-relaxed text-ink-2">
              บัญชี <span className="font-mono text-[13px]">{user.email}</span>{" "}
              ไม่มีสิทธิ์แอดมิน
            </p>

            {/* แยกสองสาเหตุให้ชัด เพราะแก้คนละทาง: ยังไม่ได้ตั้งค่าเลย
                กับตั้งไว้แล้วแต่เป็นอีเมลอื่น */}
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink-2">
              {adminConfigured() ? (
                <>
                  สิทธิ์แอดมินกำหนดจากตัวแปร{" "}
                  <code className="font-mono text-[12px] text-accent">ADMIN_EMAILS</code>{" "}
                  ถ้าต้องการให้บัญชีนี้เข้าได้ ให้เพิ่มอีเมลนี้เข้าไปในรายการ แล้วดีพลอยใหม่
                </>
              ) : (
                <>
                  ยังไม่ได้ตั้ง{" "}
                  <code className="font-mono text-[12px] text-accent">ADMIN_EMAILS</code>{" "}
                  จึงยังไม่มีใครเป็นแอดมิน ตั้งเป็นอีเมลของคุณ (คั่นด้วยจุลภาคถ้ามีหลายคน)
                  ในตัวแปรสภาพแวดล้อมของโปรเจกต์ แล้วดีพลอยใหม่
                </>
              )}
            </p>

            <Link href="/th" className="text-[13.5px] text-accent hover:underline">
              ← กลับหน้าเว็บ
            </Link>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="th-TH" className={fontVariables}>
      <body className="font-sans">
        {/* กว้างกว่าหน้าเว็บสาธารณะ เพราะตารางจัดการการ์ดมีช่องกรอกราคาสี่ช่อง
            ต่อแถว ถ้าบีบเท่าหน้าเว็บจะต้องเลื่อนตารางแนวนอนตลอดเวลาที่กรอก */}
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-8 sm:px-8">
          <div className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
            <h1 className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">
              แดชบอร์ด
            </h1>
            <nav className="flex flex-wrap gap-4 text-[13.5px] text-ink-2">
              {[
                // ภาพรวมต้องเทียบแบบตรงตัว ไม่งั้นมันจะติดสีค้างทุกหน้าในแดชบอร์ด
                { href: "/admin", label: "ภาพรวม", exact: true },
                { href: "/admin/home", label: "ตั้งค่าหน้าแรก" },
                { href: "/admin/sets", label: "จัดการชุด" },
                // จัดการการ์ดกับอัปเดตราคาเป็นหน้าเดียวกันแล้ว — ลิงก์ต้นทางกับ
                // ช่องราคาทั้งสี่อยู่ในแถวเดียวกับการ์ด ไม่ต้องสลับหน้าระหว่างกรอก
                { href: "/admin/cards", label: "จัดการการ์ด · ราคา" },
                { href: "/admin/users", label: "ผู้ใช้" },
              ].map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  exact={item.exact}
                  className="border-b-2 pb-0.5 transition-colors"
                  activeClassName="border-accent font-bold text-accent"
                  inactiveClassName="border-transparent hover:text-ink"
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-4 text-[13px]">
              <span className="font-mono text-[11px] text-ink-3">{user.email}</span>
              <Link href="/th" className="text-ink-3 hover:text-accent">
                ← กลับหน้าเว็บ
              </Link>
            </div>
          </div>

          {STORAGE_KIND === "supabase" && (
            <div className="rounded-lg border border-up/40 bg-up/5 px-4 py-3 text-[13px] text-ink-2">
              <b className="text-ink">บันทึกได้ — เก็บใน Supabase</b> ราคา การ์ด ผู้ใช้
              และพอร์ตอยู่ในตารางจริงของ Postgres ส่วนรูปการ์ดอยู่ใน Supabase Storage
            </div>
          )}

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
