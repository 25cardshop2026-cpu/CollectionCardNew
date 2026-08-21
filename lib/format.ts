const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export function formatBaht(value: number): string {
  return baht.format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * "อัปเดต 2 ชม.ที่แล้ว" — ใช้ใน Server Component เท่านั้น
 * ถ้าเรียกจากฝั่ง client จะเกิด hydration mismatch เพราะเวลาต่างกัน
 */
export function formatAge(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "เมื่อครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} วันก่อน`;
  return formatDate(iso);
}

export function trendClass(change: number | null): string {
  if (change === null || change === 0) return "text-ink-3";
  return change > 0 ? "text-up" : "text-down";
}
