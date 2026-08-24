"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addHoldingAction, type PortfolioState } from "@/lib/portfolio-actions";
import type { Locale } from "@/lib/i18n/config";
import type { Condition } from "@/lib/types";

/**
 * ฟอร์ม "เพิ่มเข้าพอร์ต" ที่ฝังอยู่บนหน้าการ์ด
 *
 * ตัวเลือกสภาพส่งมาเป็น prop พร้อมคำแปลแล้ว เพราะ dictionary มีฟังก์ชันปนอยู่
 * ส่งข้ามมาที่ client component ทั้งก้อนไม่ได้
 */

export interface AddHoldingLabels {
  condition: string;
  quantity: string;
  cost: string;
  costHint: string;
  note: string;
  noteHint: string;
  submit: string;
  working: string;
}

const inputClass =
  "w-full rounded-[4px] border border-line-strong bg-surface-2 px-2.5 py-1.5 text-[13.5px] focus:border-accent focus:bg-accent-soft";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3";

function Submit({ label, working }: { label: string; working: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm disabled:opacity-60">
      {pending ? working : label}
    </button>
  );
}

export function AddHoldingForm({
  cardId,
  locale,
  redirectTo,
  conditions,
  labels,
}: {
  cardId: string;
  locale: Locale;
  redirectTo: string;
  conditions: { value: Condition; label: string }[];
  labels: AddHoldingLabels;
}) {
  const [state, formAction] = useActionState<PortfolioState, FormData>(addHoldingAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="cardId" value={cardId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {state.error && (
        <p
          role="alert"
          className="rounded-[4px] border border-down/50 bg-down/5 px-3 py-2 text-[13px] text-down"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{labels.condition}</span>
          <select name="condition" defaultValue="NM" className={inputClass}>
            {conditions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{labels.quantity}</span>
          <input
            type="number"
            name="quantity"
            min={1}
            max={9999}
            defaultValue={1}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{labels.cost}</span>
          <input
            name="costThb"
            inputMode="numeric"
            placeholder="—"
            className={inputClass}
          />
          <span className="text-[11px] text-ink-3">{labels.costHint}</span>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{labels.note}</span>
        <input name="note" placeholder={labels.noteHint} className={inputClass} />
      </label>

      <div>
        <Submit label={labels.submit} working={labels.working} />
      </div>
    </form>
  );
}
