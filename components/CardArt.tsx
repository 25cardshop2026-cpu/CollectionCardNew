import { TIER_SURFACE, rarityTier } from "@/lib/rarity";
import type { Card } from "@/lib/types";

/**
 * หน้าการ์ด
 *
 * ยังไม่ใส่รูปการ์ดจริงเพราะเป็นงานมีลิขสิทธิ์ ต้องตัดสินใจเรื่องสิทธิ์ก่อน
 * (ดู docs/PLAN.md ข้อ 6.13) ระหว่างนี้จึงทำที่ว่างให้เป็นผิวฟอยล์ตามระดับ
 * ความหายากแทน ซึ่งสื่อสารได้จริงและไม่ต้องรอ
 * เมื่อพร้อมแล้วให้วาง next/image ทับชั้นในโดยคงกรอบและเงาไว้
 */
export function CardArt({
  card,
  className = "",
}: {
  card: Card;
  className?: string;
}) {
  const tier = rarityTier(card.rarity);

  return (
    <div className={`card-face ${TIER_SURFACE[tier]} aspect-[5/7] ${className}`}>
      {/* กรอบในแบบการ์ดจริง */}
      <div className="absolute inset-[6px] rounded-[5px] border border-white/10 mix-blend-overlay" />

      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-[3px] border border-white/15 bg-black/20 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-ink backdrop-blur-sm">
            {card.rarity}
          </span>
          {tier === "mythic" && (
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink/70">
              foil
            </span>
          )}
        </div>

        {/* ชื่อการ์ดอยู่ใต้รูปอยู่แล้ว บนหน้าการ์ดจึงเหลือแค่เลขการ์ด ไม่ซ้ำซ้อน */}
        <span className="font-mono text-[9.5px] tracking-[0.06em] text-ink/60">
          {card.number}
        </span>
      </div>
    </div>
  );
}
