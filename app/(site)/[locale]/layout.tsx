import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { NavLink } from "@/components/NavLink";
import { SearchBox } from "@/components/SearchBox";
import { fontVariables } from "@/lib/fonts";
import { getDictionary } from "@/lib/i18n";
import { HTML_LANG, isLocale, localePath } from "@/lib/i18n/config";
import "../../globals.css";

// ไม่ใช้ generateStaticParams เพราะจะทำให้หน้าถูก prerender ตั้งแต่ตอน build
// แล้วข้อมูลที่แก้ในแดชบอร์ดจะไม่ขึ้น — middleware จัดการ routing ให้อยู่แล้ว
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = getDictionary(locale);

  return {
    title: { default: t.meta.siteTitle, template: "%s · Collection Card" },
    description: t.meta.siteDescription,
    // บอก Google ว่าหน้าเดียวกันมีอีกภาษาอยู่ที่ไหน ไม่งั้นจะถูกมองว่าเนื้อหาซ้ำ
    alternates: {
      languages: {
        th: "/th",
        en: "/en",
        "x-default": "/th",
      },
    },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  // หน้าแรกต้องเทียบแบบตรงตัว ไม่งั้นจะติดสีค้างทุกหน้าเพราะทุก path ขึ้นต้นด้วย /th
  const nav = [
    { href: p("/"), label: t.nav.home, exact: true },
    { href: p("/browse"), label: t.nav.browse },
    { href: p("/g/one-piece"), label: "One Piece" },
    { href: p("/g/pokemon"), label: "Pokémon" },
    { href: p("/movers"), label: t.nav.movers },
  ];

  return (
    <html lang={HTML_LANG[locale]} className={fontVariables}>
      {/* คลาส site เปิดฉากหลังนีออน (แสง ตาราง เส้นสแกน) ที่นิยามไว้ใน globals.css */}
      <body className="font-sans site">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 bg-[var(--glass)] backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-8">
              <Link href={p("/")} className="group flex items-center gap-2.5 leading-none">
                <span className="pulse-dot" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="font-display text-[19px] font-semibold tracking-[-0.01em] transition-colors group-hover:text-accent">
                    Collection Card
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-accent/70">
                    {t.nav.tagline}
                  </span>
                </span>
              </Link>

              <nav className="hidden items-center gap-6 text-[14px] text-ink-2 lg:flex">
                {nav.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    exact={item.exact}
                    className="transition-colors hover:text-accent"
                    activeClassName="font-semibold text-accent [text-shadow:0_0_14px_rgba(62,231,255,0.5)]"
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              {/* ช่องค้นหาอยู่กลางแถบหัวเว็บบนจอกว้าง จอแคบใช้ลิงก์ในแถวเมนูแทน */}
              <div className="ml-auto hidden w-[260px] xl:block">
                <SearchBox
                  action={p("/search")}
                  placeholder={t.search.placeholder}
                  submitLabel={t.search.submit}
                  compact
                />
              </div>

              <div className="ml-auto flex items-center gap-2.5 xl:ml-4">
                <LocaleSwitcher current={locale} />
                {/* จอแคบใช้ลิงก์ในแถวเมนูข้างล่างแทน จะได้ไม่ซ้ำกัน */}
                <Link
                  href="/admin"
                  className="hidden rounded-full border border-line-strong px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 transition-colors hover:border-accent hover:text-accent lg:inline-block"
                >
                  {t.nav.dashboard}
                </Link>
                <Link href={p("/browse")} className="btn btn-primary btn-sm">
                  {t.nav.start}
                </Link>
              </div>
            </div>
            {/* แถวเมนูของจอแคบ — เมนูหลักถูกซ่อนต่ำกว่า lg ถ้าไม่มีแถวนี้
                คนใช้มือถือจะเข้าหน้าอื่นหรือแดชบอร์ดไม่ได้เลยนอกจากพิมพ์ URL เอง
                เลื่อนแนวนอนได้ ไม่ต้องมีปุ่มแฮมเบอร์เกอร์ที่ต้องใช้ JS */}
            <nav className="flex items-center gap-2 overflow-x-auto px-5 pb-2.5 [scrollbar-width:none] sm:px-8 lg:hidden [&::-webkit-scrollbar]:hidden">
              {nav.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  exact={item.exact}
                  className="shrink-0 rounded-full border px-3 py-1 text-[12.5px] whitespace-nowrap transition-colors"
                  activeClassName="border-accent bg-accent-soft font-semibold text-accent"
                  inactiveClassName="border-line-strong text-ink-2 hover:border-accent hover:text-accent"
                >
                  {item.label}
                </NavLink>
              ))}
              <Link
                href={p("/search")}
                className="shrink-0 rounded-full border border-line-strong px-3 py-1 text-[12.5px] whitespace-nowrap text-ink-2 transition-colors hover:border-accent hover:text-accent"
              >
                {t.search.title}
              </Link>
              <Link
                href="/admin"
                className="shrink-0 rounded-full border border-accent-line px-3 py-1 font-mono text-[10.5px] whitespace-nowrap text-accent uppercase"
              >
                {t.nav.dashboard}
              </Link>
            </nav>

            <div className="accent-rule h-px" aria-hidden="true" />
          </header>

          <main className="flex-1">{children}</main>

          <footer className="mt-24 border-t border-line">
            <div className="foil-rule h-px opacity-60" aria-hidden="true" />
            <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-8">
                <div className="flex flex-col gap-2">
                  <span className="font-display text-[17px] font-semibold">
                    Collection Card
                  </span>
                  <p className="max-w-[42ch] text-[13px] leading-relaxed text-ink-3">
                    {t.footer.blurb}
                  </p>
                </div>
                <nav className="flex flex-col gap-2 text-[13.5px] text-ink-2">
                  {nav.map((item) => (
                    <Link key={item.href} href={item.href} className="hover:text-accent">
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/admin" className="mt-1 text-ink-3 hover:text-accent">
                    {t.nav.dashboard}
                  </Link>
                </nav>
              </div>
              <div className="hairline my-8" />
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                {t.footer.phase}
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
