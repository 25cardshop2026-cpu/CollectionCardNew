export const LOCALES = ["th", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "th";

export const LOCALE_LABEL: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
};

/** ใช้ใน <html lang> และใน hreflang */
export const HTML_LANG: Record<Locale, string> = {
  th: "th-TH",
  en: "en",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** ต่อ path ให้มี prefix ภาษาเสมอ เช่น ("en", "/movers") → "/en/movers" */
export function localePath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/** ตัด prefix ภาษาออกจาก pathname เพื่อสลับไปอีกภาษาโดยอยู่หน้าเดิม */
export function stripLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    return `/${segments.slice(1).join("/")}`;
  }
  return pathname;
}
