"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, registerAction, type AuthState } from "@/lib/auth-actions";
import type { Locale } from "@/lib/i18n/config";

/**
 * ฟอร์มเข้าสู่ระบบและสมัครสมาชิก — โครงเดียวกัน ต่างกันแค่ช่องชื่อที่ใช้แสดง
 *
 * รับข้อความเป็น prop ทีละคำแทนที่จะรับทั้ง dictionary เพราะ dictionary มี
 * ฟังก์ชันปนอยู่ ซึ่งส่งข้ามจากเซิร์ฟเวอร์มาที่ client component ไม่ได้
 */

export interface AuthLabels {
  email: string;
  displayName: string;
  password: string;
  passwordHint: string;
  submit: string;
  working: string;
}

const inputClass =
  "w-full rounded-[4px] border border-line-strong bg-surface-2 px-3 py-2 text-[14px] focus:border-accent focus:bg-accent-soft";

const labelClass =
  "font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3";

function Submit({ label, working }: { label: string; working: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn btn-primary btn-sm disabled:opacity-60">
      {pending ? working : label}
    </button>
  );
}

export function AuthForm({
  mode,
  locale,
  redirectTo,
  labels,
}: {
  mode: "login" | "register";
  locale: Locale;
  redirectTo?: string;
  labels: AuthLabels;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    mode === "login" ? loginAction : registerAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

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
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </label>

      {mode === "register" && (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{labels.displayName}</span>
          <input type="text" name="displayName" required autoComplete="nickname" className={inputClass} />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{labels.password}</span>
        <input
          type="password"
          name="password"
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={inputClass}
        />
        {mode === "register" && (
          <span className="text-[11.5px] text-ink-3">{labels.passwordHint}</span>
        )}
      </label>

      <Submit label={labels.submit} working={labels.working} />
    </form>
  );
}
