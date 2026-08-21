import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";

/**
 * ทุก URL ของหน้าเว็บสาธารณะต้องมี prefix ภาษาเสมอ (/th/... หรือ /en/...)
 * ถ้าเข้ามาโดยไม่มี prefix จะเดาจากภาษาของเบราว์เซอร์แล้ว redirect ไปให้
 *
 * /admin และ /api ไม่ผ่านตรงนี้ เพราะแดชบอร์ดเป็นภาษาไทยอย่างเดียว
 */

function pickLocale(request: NextRequest): Locale {
  const header = request.headers.get("accept-language");
  if (!header) return DEFAULT_LOCALE;

  // เรียงตาม q-value แล้วหยิบภาษาแรกที่เรารองรับ
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // ข้ามไฟล์ระบบ ไฟล์สแตติก แดชบอร์ด และ API
    "/((?!_next|api|admin|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
