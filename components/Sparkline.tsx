import { formatBaht } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { PricePoint } from "@/lib/types";

/** กราฟราคาย้อนหลัง — area + เส้นทอง + จุดเน้นที่ปลาย พร้อมป้ายราคาสูงสุด/ต่ำสุด */
export function Sparkline({
  points,
  t,
  locale,
  width = 720,
  height = 200,
  label,
}: {
  points: PricePoint[];
  t: Dictionary;
  locale: Locale;
  width?: number;
  height?: number;
  label: string;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center text-[13px] text-ink-3">
        {t.card.notEnoughData}
      </div>
    );
  }

  const values = points.map((p) => p.priceThb);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padY = 18;

  const x = (i: number) => (i / (points.length - 1)) * width;
  const y = (v: number) => padY + (1 - (v - min) / span) * (height - padY * 2);

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.priceThb).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;

  const lastX = x(points.length - 1);
  const lastY = y(values[values.length - 1]);

  return (
    <figure className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
          <filter id="spark-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={width}
            y1={padY + f * (height - padY * 2)}
            y2={padY + f * (height - padY * 2)}
            stroke="var(--line)"
            strokeWidth={1}
          />
        ))}

        <path d={area} fill="url(#spark-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={lastX} cy={lastY} r={4} fill="var(--gold)" filter="url(#spark-glow)" />
      </svg>

      <figcaption className="flex justify-between font-mono text-[11px] tabular-nums text-ink-3">
        <span>
          {t.card.low} {formatBaht(min, locale)}
        </span>
        <span>{t.card.days(points.length)}</span>
        <span>
          {t.card.high} {formatBaht(max, locale)}
        </span>
      </figcaption>
    </figure>
  );
}
