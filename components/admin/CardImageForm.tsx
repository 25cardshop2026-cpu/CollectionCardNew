import { ImagePicker } from "@/components/admin/ImagePicker";
import { removeCardImageAction, uploadCardImageAction } from "@/lib/actions";
import type { Card } from "@/lib/types";

/**
 * อัปโหลดรูปการ์ด
 *
 * ตัวฟอร์มยังเป็นฟอร์มธรรมดาที่ส่งเข้า server action ตรง ๆ ไฟล์จึงวิ่งเข้า
 * ที่เก็บข้อมูลโดยไม่ต้องมีเส้นทางอัปโหลดแยก ส่วนการวางด้วย Ctrl+V กับลากไฟล์
 * มาวางเป็นของเพิ่มใน ImagePicker ที่ยัดไฟล์กลับเข้า input ตัวเดิม
 *
 * รูปจะขึ้นบนหน้าเว็บสาธารณะทันทีที่บันทึกเสร็จ
 */
export function CardImageForm({
  card,
  returnTo,
}: {
  card: Card;
  /** หน้าที่จะกลับไปหลังอัปหรือลบรูป — ใช้ตอนเรียกจากหน้าตั้งค่าหน้าแรก */
  returnTo?: string;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[14px] font-bold">รูปการ์ด</h3>
        {card.imageUrl && (
          <form action={removeCardImageAction}>
            <input type="hidden" name="id" value={card.id} />
            {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
            <button
              type="submit"
              className="rounded-[3px] border border-down px-2 py-[3px] text-[12.5px] text-down hover:bg-down hover:text-bg"
            >
              ลบรูปนี้
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="w-[132px] shrink-0">
          {card.imageUrl ? (
            // ใช้ img ธรรมดาเพราะรูปมาจาก API ของเราเองที่ตั้งแคชถาวรไว้แล้ว
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl}
              alt={`รูปการ์ด ${card.number}`}
              className="w-full rounded-[6px] border border-line-strong"
            />
          ) : (
            <div className="flex aspect-[5/7] w-full items-center justify-center rounded-[6px] border border-dashed border-line-strong text-center text-[12px] text-ink-3">
              ยังไม่มีรูป
            </div>
          )}
        </div>

        <form action={uploadCardImageAction} className="flex flex-1 flex-col gap-3">
          <input type="hidden" name="id" value={card.id} />
          {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
          <ImagePicker name="image" />
          <p className="text-[12px] text-ink-3">
            PNG, JPEG, WebP หรือ AVIF ขนาดไม่เกิน 5 MB · สัดส่วนที่พอดีกับกรอบคือ 5:7
            เหมือนการ์ดจริง
          </p>
          <button
            type="submit"
            className="self-start rounded-[4px] border border-accent bg-accent px-3 py-1.5 text-[13px] font-bold text-on-accent"
          >
            อัปโหลดรูป
          </button>
        </form>
      </div>
    </section>
  );
}
