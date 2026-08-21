"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormError, SelectField, SubmitButton } from "./Form";
import { createSetAction, type FormState } from "@/lib/actions";
import type { Game } from "@/lib/types";

export function SetForm({ games }: { games: Game[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(createSetAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-2xl">
      <FormError message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="เกม"
          name="gameSlug"
          options={games.map((game) => ({ value: game.slug, label: game.nameEn }))}
        />
        <Field
          label="รหัสชุด"
          name="code"
          required
          placeholder="OP-10"
          hint="ต้องไม่ซ้ำ ใช้เป็น URL ของหน้าชุด"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ชื่อชุด (ไทย)" name="nameTh" required placeholder="ราชาโจรสลัด" />
        <Field
          label="ชื่อชุด (อังกฤษ)"
          name="nameEn"
          placeholder="Royal Blood"
          hint="เว้นว่างได้ จะใช้ชื่อไทยแทน"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="ภาษา"
          name="language"
          defaultValue="JP"
          options={[
            { value: "JP", label: "JP — ฉบับญี่ปุ่น" },
            { value: "EN", label: "EN — ฉบับอังกฤษ" },
          ]}
          hint="คนละภาษา = คนละตลาด"
        />
        <Field label="วันวางจำหน่าย" name="releaseDate" type="date" required />
        <Field
          label="จำนวนการ์ดในชุด"
          name="totalCards"
          inputMode="numeric"
          defaultValue="0"
          hint="ใช้คำนวณ % ความสมบูรณ์"
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>เพิ่มชุด</SubmitButton>
        <Link href="/admin/cards" className="text-[13.5px] text-ink-3 hover:text-gold">
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
