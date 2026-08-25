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

      <Field
        label="ลิงก์ต้นทางราคา"
        name="sourceUrl"
        type="url"
        defaultValue={card?.sourceUrl}
        placeholder="https://..."
        hint="หน้าร้านหรือหน้าประมูลที่ใช้ดูราคาใบนี้ — จะขึ้นเป็นปุ่มเปิดในหน้าอัปเดตราคา ถ้าวางลิงก์หน้าสินค้า SNKRDUNK ตรงนี้ ระบบจะดึงเลขสินค้าไปผูกซิงก์ราคาอัตโนมัติให้เองด้วย เว้นว่าง = ไม่มีต้นทาง"
      />

      {isEdit && (
        <Field
          label="เลขสินค้า SNKRDUNK"
          name="snkrdunkCode"
          defaultValue={card?.snkrdunkCode}
          placeholder="864495 หรือวางลิงก์เต็ม ๆ ก็ได้"
          hint="วางเป็นตัวเลขล้วน หรือ URL เต็ม ๆ ของหน้าสินค้า (เช่น .../trading-cards/864495) ก็ได้ ระบบแกะเลขให้เอง — ใส่แล้วช่อง SNKRDUNK จะได้ราคาต่ำสุดปัจจุบันอัปเดตอัตโนมัติตามรอบ เว้นว่าง = ไม่ซิงก์ใบนี้ ปกติไม่ต้องกรอกช่องนี้เองถ้าลิงก์ต้นทางด้านบนเป็นลิงก์ SNKRDUNK อยู่แล้ว"
        />
      )}

      {!isEdit && (
        <p className="-mt-2 text-[11.5px] text-ink-3">
          ลิงก์นี้จะติดไปให้ทุกแบบพิมพ์ที่สร้างพร้อมกัน แก้แยกทีละใบได้ทีหลัง
        </p>
      )}

      {!isEdit && (
        <>
          <CheckboxGroup
            label="แบบพิมพ์ที่มี"
            name="variants"
            hint="แต่ละแบบถูกสร้างเป็นการ์ดคนละใบ มีหน้าและราคาของตัวเอง — Normal สร้างให้เสมอ"
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
