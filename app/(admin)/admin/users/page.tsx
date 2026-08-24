import { listAccounts } from "@/lib/admin-users";
import { mailConfigured } from "@/lib/mail";
import { listPendingResets } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function AdminUsersPage() {
  const [accounts, pending] = await Promise.all([listAccounts(), listPendingResets()]);
  const mailReady = mailConfigured();

  const headClass =
    "px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight">ผู้ใช้</h2>
        <p className="max-w-[68ch] text-[13.5px] text-ink-2">
          บัญชีที่สมัครเข้ามาในเว็บ สิทธิ์แอดมินกำหนดจากตัวแปร{" "}
          <code className="font-mono text-[12px] text-accent">ADMIN_EMAILS</code>{" "}
          ไม่ได้กดเปลี่ยนจากหน้านี้ เพื่อไม่ให้ใครที่เข้าถึงแดชบอร์ดได้ตั้งสิทธิ์เพิ่มให้ตัวเอง
        </p>
      </header>

      {/* ---------- คำขอตั้งรหัสผ่านใหม่ที่ยังค้าง ---------- */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[15px] font-bold">คำขอตั้งรหัสผ่านใหม่</h3>

        {mailReady ? (
          <p className="rounded-lg border border-up/40 bg-up/5 px-4 py-3 text-[13px] text-ink-2">
            <b className="text-ink">ต่อระบบส่งอีเมลแล้ว</b> ลิงก์ตั้งรหัสใหม่ถูกส่งถึงเจ้าของบัญชี
            โดยตรง จึงไม่ต้องมาหยิบจากหน้านี้
          </p>
        ) : (
          <p className="rounded-lg border border-down/40 bg-down/5 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
            <b className="text-ink">ยังไม่ได้ต่อระบบส่งอีเมล</b> ลิงก์ที่คนกดขอจึงมากองที่นี่
            ให้คุณคัดลอกส่งให้เจ้าตัวเอง — ตั้ง{" "}
            <code className="font-mono text-[12px] text-accent">RESEND_API_KEY</code> กับ{" "}
            <code className="font-mono text-[12px] text-accent">RESEND_FROM</code>{" "}
            แล้วระบบจะส่งอีเมลเองอัตโนมัติ
          </p>
        )}

        {pending.length === 0 ? (
          <p className="text-[13.5px] text-ink-3">ยังไม่มีคำขอที่ค้างอยู่</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-line">
                  <th className={headClass}>บัญชี</th>
                  <th className={headClass}>ขอเมื่อ</th>
                  <th className={headClass}>ลิงก์ตั้งรหัสใหม่ (ใช้ได้ 1 ชม.)</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((entry) => (
                  <tr key={entry.email} className="border-b border-line last:border-0">
                    <td className="px-3 py-2.5">
                      {entry.displayName}
                      <span className="ml-2 font-mono text-[11.5px] text-ink-3">
                        {entry.email}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-ink-2">
                      {formatDate(entry.requestedAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      {/* readOnly + เลือกทั้งช่องเมื่อคลิก เพราะสิ่งเดียวที่ต้องทำกับ
                          ลิงก์นี้คือคัดลอกไปส่งต่อ ไม่ใช่แก้ */}
                      <input
                        readOnly
                        value={entry.path}
                        aria-label={`ลิงก์ตั้งรหัสผ่านใหม่ของ ${entry.email}`}
                        className="w-full min-w-[280px] rounded-[3px] border border-line-strong bg-surface-2 px-2 py-1 font-mono text-[11.5px] text-ink-2"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- บัญชีทั้งหมด ---------- */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[15px] font-bold">บัญชีทั้งหมด ({accounts.length})</h3>

        {accounts.length === 0 ? (
          <p className="text-[13.5px] text-ink-3">ยังไม่มีใครสมัครเข้ามา</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-line">
                  <th className={headClass}>ชื่อที่ใช้แสดง</th>
                  <th className={headClass}>อีเมล</th>
                  <th className={headClass}>สมัครเมื่อ</th>
                  <th className={headClass}>สิทธิ์</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2.5">{account.displayName}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-ink-2">
                      {account.email}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-ink-2">
                      {formatDate(account.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      {account.isAdmin ? (
                        <span className="rounded-[3px] border border-accent-line bg-accent-soft px-2 py-[2px] font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                          แอดมิน
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-ink-3">ผู้ใช้ทั่วไป</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
