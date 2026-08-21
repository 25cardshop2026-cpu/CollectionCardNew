import type { PricePoint } from "@/lib/types";

/** กราฟราคาย้อนหลังแบบ area + จุดเน้นที่ปลายเส้น */
export function Sparkline({
  points,
  width = 640,
  height = 140,
  label,
}: {
  points: PricePoint[];
  width?: number;
  height?: number;
  label: string;
}) {
  if (points.length < 2) {
    return (
      <div className="text-[13px] text-ink-3">ยังมีข้อมูลราคาไม่พอสำหรับวาดกราฟ</div>
    );
  }

  const values = points.map((p) => p.priceThb);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 6;

  const x = (i: number) => (i / (points.length - 1)) * width;
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.priceThb).toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const lastX = x(points.length - 1);
  const lastY = y(values[values.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.26" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={0}
          x2={width}
          y1={pad + f * (height - pad * 2)}
          y2={pad + f * (height - pad * 2)}
          stroke="var(--line)"
          strokeWidth={1}
        />
      ))}

      <path d={area} fill="url(#spark-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={3.5} fill="var(--accent)" />
    </svg>
  );
}
