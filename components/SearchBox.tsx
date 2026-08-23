/**
 * ช่องค้นหา — เป็นฟอร์ม GET ธรรมดา
 *
 * ไม่ใช้ JavaScript เลย จึงทำงานได้ตั้งแต่ HTML ชุดแรกที่ส่งมา
 * และผลการค้นหามี URL ของตัวเอง ส่งต่อหรือกดย้อนกลับได้ตามปกติ
 */
export function SearchBox({
  action,
  defaultValue = "",
  placeholder,
  submitLabel,
  compact = false,
}: {
  action: string;
  defaultValue?: string;
  placeholder: string;
  submitLabel: string;
  compact?: boolean;
}) {
  return (
    <form action={action} role="search" className="flex w-full items-center gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`min-w-0 flex-1 rounded-full border border-line-strong bg-surface-2 px-4 text-ink placeholder:text-ink-3 focus:border-accent focus:bg-accent-soft focus:outline-none ${
          compact ? "h-8 text-[13px]" : "h-11 text-[15px]"
        }`}
      />
      <button
        type="submit"
        className={`btn btn-ghost shrink-0 ${compact ? "btn-sm" : ""}`}
      >
        {submitLabel}
      </button>
    </form>
  );
}
