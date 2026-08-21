import type { Dictionary } from "./i18n/th";
import type { Locale } from "./i18n/config";

const INTL_LOCALE: Record<Locale, string> = { th: "th-TH", en: "en-US" };

/** ราคาเป็นบาทเสมอ เพราะตลาดที่เราติดตามคือตลาดไทย แต่รูปแบบตัวเลขตามภาษา */
export function formatBaht(value: number, locale: Locale = "th"): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, locale: Locale = "th"): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function formatDate(iso: string, locale: Locale = "th"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * "อัปเดต 2 ชม.ที่แล้ว" — ใช้ใน Server Component เท่านั้น
 * ถ้าเรียกจากฝั่ง client จะเกิด hydration mismatch เพราะเวลาต่างกัน
 */
export function formatAge(
  iso: string,
  t: Dictionary,
  locale: Locale = "th",
  now: Date = new Date(),
): string {
  const minutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(iso).getTime()) / 60000),
  );

  if (minutes < 1) return t.time.justNow;
  if (minutes < 60) return t.time.minutes(minutes);

  const hours = Math.round(minutes / 60);
  if (hours < 24) return t.time.hours(hours);

  const days = Math.round(hours / 24);
  if (days < 30) return t.time.days(days);

  return formatDate(iso, locale);
}

export function trendClass(change: number | null): string {
  if (change === null || change === 0) return "text-ink-3";
  return change > 0 ? "text-up" : "text-down";
}
