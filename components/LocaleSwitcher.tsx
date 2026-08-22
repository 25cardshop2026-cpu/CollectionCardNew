"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, stripLocale, type Locale } from "@/lib/i18n/config";

/** สลับภาษาโดยอยู่หน้าเดิม ไม่เด้งกลับหน้าแรก */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const rest = stripLocale(pathname);

  return (
    <div
      className="flex items-center overflow-hidden rounded-full border border-line-strong"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((locale) => {
        const active = locale === current;
        const href = `/${locale}${rest === "/" ? "" : rest}`;

        return (
          <Link
            key={locale}
            href={href}
            hrefLang={locale}
            aria-current={active ? "true" : undefined}
            className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
              active
                ? "bg-accent text-on-accent"
                : "text-ink-3 hover:text-accent"
            }`}
          >
            {locale}
          </Link>
        );
      })}
    </div>
  );
}
