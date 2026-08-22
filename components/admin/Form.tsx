"use client";

import { useFormStatus } from "react-dom";

const inputClass =
  "w-full rounded-[4px] border border-line-strong bg-surface-2 px-2.5 py-1.5 text-[13.5px] focus:border-accent focus:bg-accent-soft";

export function Field({
  label,
  name,
  hint,
  ...props
}: {
  label: string;
  name: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <input name={name} className={inputClass} {...props} />
      {hint && <span className="text-[11.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <select name={name} defaultValue={defaultValue} className={inputClass}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <span className="text-[11.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function CheckboxGroup({
  label,
  name,
  options,
  hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string; defaultChecked?: boolean; disabled?: boolean }[];
  hint?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3 mb-1.5">
        {label}
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-1.5 text-[13px]">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={option.defaultChecked}
              disabled={option.disabled}
              className="accent-[var(--accent)]"
            />
            <span className={option.disabled ? "text-ink-3" : ""}>{option.label}</span>
          </label>
        ))}
      </div>
      {hint && <span className="text-[11.5px] text-ink-3">{hint}</span>}
    </fieldset>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-[4px] border border-down/50 bg-down/5 px-3 py-2 text-[13px] text-down">
      {message}
    </p>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[4px] border border-accent bg-accent px-4 py-2 text-[13.5px] font-bold text-on-accent disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก…" : children}
    </button>
  );
}
