import { formatBaht, formatPercent } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";

export function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "quiet";
}) {
  const styles =
    tone === "accent"
      ? "border-accent-line bg-accent-soft text-accent"
      : tone === "quiet"
        ? "border-transparent bg-surface-2 text-ink-3"
        : "border-line-strong text-ink-2";

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.1em] ${styles}`}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow flex items-center gap-3">
      {children}
      <span className="hairline flex-1" />
    </p>
  );
}

/** ราคาปัจจุบัน + การเปลี่ยนแปลง ใช้ทุกที่ที่ต้องโชว์ราคาแบบย่อ */
export function PriceTag({
  priceThb,
  change7d,
  size = "md",
  locale = "th",
}: {
  priceThb: number | null;
  change7d?: number | null;
  size?: "sm" | "md";
  locale?: Locale;
}) {
  const priceClass = size === "sm" ? "text-[13px]" : "text-[15px]";
  const trend =
    change7d === null || change7d === undefined || change7d === 0
      ? "text-ink-3"
      : change7d > 0
        ? "text-up"
        : "text-down";

  return (
    <span className="flex items-baseline gap-2">
      <span className={`font-mono ${priceClass} font-medium tabular-nums text-ink`}>
        {priceThb === null ? "—" : formatBaht(priceThb, locale)}
      </span>
      {change7d !== undefined && (
        <span className={`font-mono text-[11px] tabular-nums ${trend}`}>
          {formatPercent(change7d)}
        </span>
      )}
    </span>
  );
}
