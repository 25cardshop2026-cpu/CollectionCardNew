"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBaht } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";

/**
 * ช่องค้นหา — เป็นฟอร์ม GET ธรรมดาที่มีกล่องแนะนำผลลัพธ์ทับอยู่ข้างบน
 *
 * ตัวฟอร์มยังทำงานได้เองโดยไม่ต้องมี JavaScript: พิมพ์แล้วกด Enter ก็ไปหน้า
 * ค้นหาเต็มพร้อม URL ของตัวเอง ส่งต่อหรือกดย้อนกลับได้ตามปกติ
 * กล่องแนะนำเป็นของที่เพิ่มทับลงไปเฉย ๆ ไม่ได้เป็นทางเดียวที่จะค้นหาได้
 *
 * ที่ต้องระวังคือ "แข่งกันตอบ": พิมพ์เร็ว ๆ จะมี fetch หลายก้อนวิ่งพร้อมกัน
 * ก้อนเก่าอาจตอบกลับมาทีหลังก้อนใหม่ ถ้าไม่ทิ้งก้อนที่ล้าสมัย ผลที่โชว์จะ
 * เป็นของคำค้นก่อนหน้า — ตรงนี้กันด้วยการจำคำค้นล่าสุดไว้เทียบก่อนรับผล
 */

export interface SearchResult {
  slug: string;
  number: string;
  nameTh: string;
  nameEn: string;
  setCode: string;
  rarity: string;
  variantLabel: string;
  priceThb: number | null;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 180;

export function SearchBox({
  action,
  locale,
  defaultValue = "",
  placeholder,
  submitLabel,
  compact = false,
}: {
  action: string;
  locale: Locale;
  defaultValue?: string;
  placeholder: string;
  submitLabel: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const listId = useId();

  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const box = useRef<HTMLDivElement>(null);
  // คำค้นของ fetch ก้อนล่าสุดที่ยิงออกไป ใช้ทิ้งผลของก้อนที่ล้าสมัย
  const latest = useRef("");

  useEffect(() => {
    const wanted = query.trim();
    latest.current = wanted;

    if (wanted.length < MIN_QUERY) {
      setResults([]);
      return;
    }

    // หน่วงไว้ก่อนยิง ไม่งั้นพิมพ์ชื่อเดียวจะยิงเป็นสิบครั้ง
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(wanted)}`);
        const data = (await res.json()) as { results?: SearchResult[] };
        if (latest.current !== wanted) return;

        setResults(data.results ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        // ค้นแบบแนะนำล้มเหลวไม่ใช่เรื่องคอขาดบาดตาย — กด Enter ไปหน้าค้นหาเต็มได้
        setResults([]);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // คลิกที่อื่นในหน้าแล้วปิดกล่อง — ต้องดักที่ระดับเอกสาร เพราะ blur ของ input
  // ยิงก่อนคลิกที่รายการจะทำงาน ทำให้กดผลลัพธ์ไม่ติด
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const shown = open && results.length > 0;

  function go(result: SearchResult) {
    setOpen(false);
    router.push(`/${locale}/card/${result.slug}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!shown) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      // เลือกรายการไว้แล้วให้ไปหน้าการ์ดใบนั้นเลย ไม่ต้องผ่านหน้าค้นหา
      event.preventDefault();
      go(results[active]);
    }
  }

  return (
    <div ref={box} className="relative w-full">
      <form action={action} role="search" className="flex w-full items-center gap-2">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={shown}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
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
            <SearchIcon />
          </button>
        ) : (
          <button type="submit" className="btn btn-ghost shrink-0 whitespace-nowrap">
            {submitLabel}
          </button>
        )}
      </form>

      {shown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 z-50 w-full min-w-[280px] overflow-hidden rounded-lg border border-line-strong bg-surface shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
        >
          {results.map((result, index) => (
            <li key={result.slug} role="option" aria-selected={index === active}>
              <button
                type="button"
                // ใช้ mousedown ไม่ใช่ click เพราะ blur ของช่องพิมพ์มาก่อน click
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(result);
                }}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                  index === active ? "bg-accent-soft" : "hover:bg-surface-2"
                }`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px]">
                    {locale === "th" ? result.nameTh : result.nameEn}
                  </span>
                  <span className="truncate font-mono text-[10.5px] tracking-[0.06em] text-ink-3">
                    {result.number} · {result.setCode} · {result.rarity}
                    {result.variantLabel !== "Normal" && ` · ${result.variantLabel}`}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-ink-2">
                  {result.priceThb === null ? "—" : formatBaht(result.priceThb, locale)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
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
  );
}
