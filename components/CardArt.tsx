import type { Card, VariantType } from "@/lib/types";

/**
 * ที่ว่างสำหรับรูปการ์ด
 *
 * ยังไม่ใส่รูปการ์ดจริงเพราะเป็นงานมีลิขสิทธิ์ — ต้องตัดสินใจเรื่องสิทธิ์ก่อน
 * (ดู docs/PLAN.md ข้อ 6.13) เมื่อพร้อมแล้วให้เปลี่ยนเป็น next/image
 * โดยอ่าน card.imageUrl จากฐานข้อมูล
 */
export function CardArt({
  card,
  variantType = "normal",
  className = "",
}: {
  card: Card;
  variantType?: VariantType;
  className?: string;
}) {
  const isSpecial = variantType !== "normal";

  return (
    <div
      className={`relative aspect-[5/7] overflow-hidden rounded-md border ${
        isSpecial ? "border-accent bg-accent-soft" : "border-line bg-surface-3"
      } ${className}`}
    >
      <div className="absolute inset-0 flex flex-col justify-between p-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3">
          {card.rarity}
        </span>
        <span className="text-[11px] leading-tight text-ink-2 line-clamp-2">
          {card.nameTh}
        </span>
      </div>
    </div>
  );
}
