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
      {/* บนแถบหัวเว็บใช้ปุ่มแว่นขยายแทนคำว่า "ค้นหา" — คำเต็มกินที่ไปเกือบ
          ครึ่งของช่องที่มี ทั้งที่คนพิมพ์เสร็จก็กด Enter อยู่แล้ว
          ส่วนหน้าค้นหาเต็มยังใช้ปุ่มมีคำ เพราะที่นั่นไม่ได้แย่งที่กับอะไร */}
      {compact ? (
        <button
          type="submit"
          aria-label={submitLabel}
          className="btn btn-ghost btn-sm shrink-0 px-2.5"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      ) : (
        <button type="submit" className="btn btn-ghost shrink-0 whitespace-nowrap">
          {submitLabel}
        </button>
      )}
    </form>
  );
}
