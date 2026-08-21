import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai, Trirong } from "next/font/google";
import Link from "next/link";
import "./globals.css";

/**
 * เซอริฟไทยสำหรับพาดหัว + Plex สำหรับเนื้อความและตัวเลข
 * คู่นี้เลือกเพราะ Trirong ให้ความรู้สึกแบบสิ่งพิมพ์ประณีต
 * ส่วน Plex Mono ทำให้เลขการ์ดกับราคาเรียงเป็นคอลัมน์สวยงาม
 */
const trirong = Trirong({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-trirong",
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-thai",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Collection Card — ราคาการ์ดสะสม One Piece และ Pokémon",
    template: "%s · Collection Card",
  },
  description:
    "ฐานข้อมูลราคาการ์ดสะสม One Piece และ Pokémon แยกตามชุด เวอร์ชัน และสภาพการ์ด พร้อมราคาย้อนหลัง",
};

const NAV = [
  { href: "/", label: "หน้าแรก" },
  { href: "/browse", label: "เลือกเกม" },
  { href: "/g/one-piece", label: "One Piece" },
  { href: "/g/pokemon", label: "Pokémon" },
  { href: "/movers", label: "ราคาขยับแรง" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={`${trirong.variable} ${plexThai.variable} ${plexMono.variable}`}
    >
      <body className="font-sans">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--glass)]">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-8">
              <Link href="/" className="group/logo flex flex-col leading-none">
                <span className="font-display text-[19px] font-semibold tracking-[-0.01em]">
                  Collection Card
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3">
                  ราคาการ์ดสะสม
                </span>
              </Link>

              <nav className="hidden items-center gap-6 text-[14px] text-ink-2 lg:flex">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition-colors hover:text-gold"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="ml-auto flex items-center gap-2.5">
                <Link
                  href="/admin"
                  className="hidden rounded-full border border-line-strong px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 transition-colors hover:border-gold hover:text-gold sm:inline-block"
                >
                  แดชบอร์ด
                </Link>
                <Link href="/browse" className="btn btn-primary btn-sm">
                  เริ่มใช้งาน
                </Link>
              </div>
            </div>
            <div className="gold-rule h-px" aria-hidden="true" />
          </header>

          <main className="flex-1">{children}</main>

          <footer className="mt-24 border-t border-line">
            <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-8">
                <div className="flex flex-col gap-2">
                  <span className="font-display text-[17px] font-semibold">
                    Collection Card
                  </span>
                  <p className="max-w-[38ch] text-[13px] leading-relaxed text-ink-3">
                    ฐานข้อมูลราคาการ์ดสะสมสำหรับนักสะสมชาวไทย
                    แยกราคาตามเวอร์ชันและสภาพการ์ดอย่างละเอียด
                  </p>
                </div>
                <nav className="flex flex-col gap-2 text-[13.5px] text-ink-2">
                  {NAV.map((item) => (
                    <Link key={item.href} href={item.href} className="hover:text-gold">
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="hairline my-8" />
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                เฟส P0 · ข้อมูลตัวอย่างเพื่อสาธิตโครงสร้าง ยังไม่ใช่ราคาตลาดจริง
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
