import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
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

  const nav = [
    { href: p("/"), label: t.nav.home },
    { href: p("/browse"), label: t.nav.browse },
    { href: p("/g/one-piece"), label: "One Piece" },
    { href: p("/g/pokemon"), label: "Pokémon" },
    { href: p("/movers"), label: t.nav.movers },
  ];

  return (
    <html lang={HTML_LANG[locale]} className={fontVariables}>
      <body className="font-sans">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 bg-[var(--glass)] backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-8">
              <Link href={p("/")} className="flex flex-col leading-none">
                <span className="font-display text-[19px] font-semibold tracking-[-0.01em]">
                  Collection Card
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3">
                  {t.nav.tagline}
                </span>
              </Link>

              <nav className="hidden items-center gap-6 text-[14px] text-ink-2 lg:flex">
                {nav.map((item) => (
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
                <LocaleSwitcher current={locale} />
                <Link
                  href="/admin"
                  className="hidden rounded-full border border-line-strong px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 transition-colors hover:border-gold hover:text-gold sm:inline-block"
                >
                  {t.nav.dashboard}
                </Link>
                <Link href={p("/browse")} className="btn btn-primary btn-sm">
                  {t.nav.start}
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
                  <p className="max-w-[42ch] text-[13px] leading-relaxed text-ink-3">
                    {t.footer.blurb}
                  </p>
                </div>
                <nav className="flex flex-col gap-2 text-[13.5px] text-ink-2">
                  {nav.map((item) => (
                    <Link key={item.href} href={item.href} className="hover:text-gold">
                      {item.label}
                    </Link>
                  ))}
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
