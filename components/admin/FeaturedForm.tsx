"use client";

import { useActionState } from "react";
import { setFeaturedCardsAction } from "@/lib/actions";

/**
 * ช่องกรอกเลขการ์ดที่จะโชว์บนหน้าแรก
 *
 * ใช้เลขการ์ดแทนรายการให้เลือก เพราะแคตตาล็อกมีสองพันกว่าใบ ทำ dropdown
 * แล้วจะหาไม่เจอและหน้าหนักเปล่า ๆ — ก๊อปเลขจากหน้าค้นหาหรือหน้าการ์ดมาวางได้เลย
 */
export function FeaturedForm({
  slots,
  pinnedIds,
}: {
  slots: number;
  pinnedIds: string[];
}) {
  const [state, action, pending] = useActionState(setFeaturedCardsAction, {});

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-end gap-3">
        {Array.from({ length: slots }, (_, index) => (
          <label key={index} className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.08em] text-ink-3 uppercase">
              ใบที่ {index + 1}
            </span>
            <input
              name="cardId"
              defaultValue={pinnedIds[index] ?? ""}
              placeholder="OP01-120"
              spellCheck={false}
              className="w-[150px] rounded-[3px] border border-line-strong bg-surface-2 px-2 py-1.5 font-mono text-[13px] tracking-[0.04em] uppercase focus:border-accent focus:bg-accent-soft focus:outline-none"
            />
          </label>
        ))}

        <button
          type="submit"
          disabled={pending}
          className="rounded-[4px] border border-accent bg-accent px-3 py-1.5 text-[13px] font-bold text-on-accent disabled:opacity-60"
        >
          {pending ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>

      {state.error && <p className="text-[13px] text-down">{state.error}</p>}

      <p className="text-[12px] text-ink-3">
        ใส่เลขการ์ดอย่าง OP01-120 · หาเลขได้จากหน้าค้นหาหรือหน้าการ์ด · เว้นว่างช่องไหนก็ได้
      </p>
    </form>
  );
}
