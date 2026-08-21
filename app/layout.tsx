import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Collection Card — ราคาการ์ดสะสม One Piece และ Pokémon",
    template: "%s · Collection Card",
  },
  description:
    "ฐานข้อมูลราคาการ์ดสะสม One Piece และ Pokémon แยกตามชุด เวอร์ชัน และสภาพการ์ด พร้อมราคาย้อนหลัง",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="font-sans antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-line bg-surface">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-6">
              <Link href="/" className="font-bold tracking-tight text-[15px]">
                Collection&nbsp;Card
              </Link>
              <nav className="flex items-center gap-5 text-[13.5px] text-ink-2">
                <Link href="/g/one-piece" className="hover:text-ink">
                  One Piece
                </Link>
                <Link href="/g/pokemon" className="hover:text-ink">
                  Pokémon
                </Link>
                <Link href="/movers" className="hover:text-ink">
                  ราคาขยับแรง
                </Link>
              </nav>
              <Link
                href="/admin"
                className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-accent"
              >
                แดชบอร์ด
              </Link>
            </div>
            <div className="foil-rule h-px" aria-hidden="true" />
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-line mt-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-[12.5px] text-ink-3 flex flex-wrap gap-x-6 gap-y-2">
              <span>Collection Card — ร่างเฟส P0</span>
              <span>ข้อมูลตัวอย่างเพื่อสาธิตโครงสร้าง ยังไม่ใช่ราคาตลาดจริง</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
