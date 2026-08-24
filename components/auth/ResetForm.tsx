"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestResetAction, resetPasswordAction, type AuthState } from "@/lib/auth-actions";
import type { Locale } from "@/lib/i18n/config";

/**
 * ฟอร์มของขั้นตอนลืมรหัสผ่าน — ทั้งขอลิงก์และตั้งรหัสใหม่ใช้โครงเดียวกัน
 * ต่างกันแค่ช่องที่กรอกกับ action ปลายทาง
 *
 * รับข้อความเป็น prop ทีละคำเหมือน AuthForm เพราะ dictionary มีฟังก์ชันปนอยู่
 * ส่งข้ามจากเซิร์ฟเวอร์มาที่ client component ทั้งก้อนไม่ได้
 */

const inputClass =
  "w-full rounded-[4px] border border-line-strong bg-surface-2 px-3 py-2 text-[14px] focus:border-accent focus:bg-accent-soft";

const labelClass = "font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3";

function Submit({ label, working }: { label: string; working: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm disabled:opacity-60">
      {pending ? working : label}
    </button>
  );
}

export function RequestResetForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { email: string; submit: string; working: string };
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(requestResetAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      {state.error && (
        <p
          role="alert"
          className="rounded-[4px] border border-down/50 bg-down/5 px-3 py-2 text-[13px] text-down"
        >
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{labels.email}</span>
        <input type="email" name="email" required autoComplete="email" className={inputClass} />
      </label>

      <Submit label={labels.submit} working={labels.working} />
    </form>
  );
}

export function NewPasswordForm({
  locale,
  token,
  labels,
}: {
  locale: Locale;
  token: string;
  labels: { password: string; hint: string; submit: string; working: string };
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(resetPasswordAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p
          role="alert"
          className="rounded-[4px] border border-down/50 bg-down/5 px-3 py-2 text-[13px] text-down"
        >
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{labels.password}</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
        <span className="text-[11.5px] text-ink-3">{labels.hint}</span>
      </label>

      <Submit label={labels.submit} working={labels.working} />
    </form>
  );
}
