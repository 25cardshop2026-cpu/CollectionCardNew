"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckboxGroup, Field, FormError, SelectField, SubmitButton } from "./Form";
import { createCardAction, updateCardAction, type FormState } from "@/lib/actions";
import type { Card, CardSet, VariantType } from "@/lib/types";
import { VARIANT_LABEL } from "@/lib/types";

const VARIANT_OPTIONS: VariantType[] = [
  "normal",
  "parallel",
  "alt_art",
  "manga",
  "full_art",
  "promo",
];

export function CardForm({
  sets,
  defaultSetCode,
  card,
}: {
  sets: CardSet[];
  defaultSetCode?: string;
  card?: Card;
}) {
  const isEdit = Boolean(card);
  const [state, formAction] = useActionState<FormState, FormData>(
    isEdit ? updateCardAction : createCardAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-2xl">
      <FormError message={state.error} />

      {isEdit ? (
        <>
          <input type="hidden" name="id" value={card!.id} />
          <div className="rounded-[4px] border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink-2">
            <span className="font-mono">{card!.number}</span> · ชุด {card!.setCode}
            <span className="ml-2 text-ink-3">
              (เลขการ์ดและชุดแก้ไม่ได้ เพราะเป็นกุญแจที่ใช้อ้างอิงราคาและ URL)
            </span>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="ชุด"
            name="setCode"
            defaultValue={defaultSetCode}
            options={sets.map((set) => ({
              value: set.code,
              label: `${set.code} · ${set.nameTh}`,
            }))}
          />
          <Field
            label="เลขการ์ด"
            name="number"
            required
            placeholder="OP01-121"
            hint="ต้องไม่ซ้ำกับการ์ดใบอื่น ใช้เป็น URL ถาวร"
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="ชื่อการ์ด (ไทย)"
          name="nameTh"
          required
          defaultValue={card?.nameTh}
          placeholder="มังกี้ ดี. ลูฟี่"
        />
        <Field
          label="ชื่อการ์ด (อังกฤษ)"
          name="nameEn"
          defaultValue={card?.nameEn}
          placeholder="Monkey D. Luffy"
          hint="เว้นว่างได้ จะใช้ชื่อไทยแทน"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Rarity" name="rarity" defaultValue={card?.rarity} placeholder="SR" />
        <Field
          label="ประเภท"
          name="cardType"
          defaultValue={card?.cardType}
          placeholder="Character"
        />
        <Field label="สี" name="color" defaultValue={card?.color} placeholder="แดง" />
      </div>

      {!isEdit && (
        <>
          <CheckboxGroup
            label="เวอร์ชันที่มี"
            name="variants"
            hint="Normal ถูกสร้างให้เสมอ เวอร์ชันพิเศษจะไปตั้งราคาต่อในหน้าอัปเดตราคา"
            options={VARIANT_OPTIONS.map((type) => ({
              value: type,
              label: VARIANT_LABEL[type],
              defaultChecked: type === "normal",
              disabled: type === "normal",
            }))}
          />
          <Field
            label="ราคาเริ่มต้น NM (บาท)"
            name="priceThb"
            inputMode="numeric"
            placeholder="120"
            hint="เว้นว่างได้ แล้วค่อยกรอกทีหลังในหน้าอัปเดตราคา"
          />
        </>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton>{isEdit ? "บันทึกการแก้ไข" : "เพิ่มการ์ด"}</SubmitButton>
        <Link
          href={`/admin/cards${card ? `?set=${card.setCode}` : ""}`}
          className="text-[13.5px] text-ink-3 hover:text-accent"
        >
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
