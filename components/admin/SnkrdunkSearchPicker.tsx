"use client";

import { useState } from "react";

interface SearchResult {
  productId: string;
  name: string;
  thumbnailUrl: string;
  link: string;
}

/**
 * ช่วยหาเลขสินค้า SNKRDUNK แทนการเปิดเว็บเองแล้วก็อปมาวาง
 *
 * ยิงค้นหาผ่าน API ของเราเอง (ไม่ใช่ตรงไปที่ snkrdunk.com เพราะโดน CORS บล็อก)
 * กดเลือกผลลัพธ์แล้วเติมช่องลิงก์ต้นทาง + เลขสินค้าให้เลย ไม่ต้องพิมพ์เอง
 * แต่ยังต้องให้คนดูรูป+ชื่อแล้วเลือกเอง เพราะการ์ดชื่อเดียวกันมีหลายรุ่นพิมพ์
 * ให้เดาเองอัตโนมัติเสี่ยงจับผิดใบ (เจอมาแล้วจริง ๆ)
 */
export function SnkrdunkSearchPicker({ defaultQuery }: { defaultQuery: string }) {
  const [query, setQuery] = useState(defaultQuery);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setStatus("loading");
    setPicked(null);

    try {
      const res = await fetch(`/api/snkrdunk-search?q=${encodeURIComponent(query.trim())}`);
      const data = (await res.json()) as { results?: SearchResult[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "ค้นหาไม่สำเร็จ");
      setResults(data.results ?? []);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function pick(result: SearchResult) {
    const sourceUrlInput = document.getElementById("sourceUrl-field") as HTMLInputElement | null;
    const codeInput = document.getElementById("snkrdunkCode-field") as HTMLInputElement | null;
    if (sourceUrlInput) sourceUrlInput.value = result.link;
    if (codeInput) codeInput.value = result.productId;
    setPicked(result.productId);
  }

  return (
    <div className="flex flex-col gap-2 rounded-[4px] border border-line-strong bg-surface-2 p-3">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
        ค้นหาใน SNKRDUNK
      </span>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
          placeholder="ชื่อการ์ด + เลขการ์ด เช่น Kaido OP01-061"
          className="w-full rounded-[4px] border border-line-strong bg-surface px-2.5 py-1.5 text-[13.5px] focus:border-accent focus:bg-accent-soft"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={status === "loading"}
          className="shrink-0 rounded-[4px] border border-line-strong px-3 py-1.5 text-[13px] hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {status === "loading" ? "กำลังค้นหา…" : "ค้นหา"}
        </button>
      </div>

      {status === "error" && <span className="text-[12px] text-down">ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง</span>}

      {status === "done" && results.length === 0 && (
        <span className="text-[12px] text-ink-3">ไม่พบผลลัพธ์ — ลองแก้คำค้นหา</span>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.productId}
              type="button"
              onClick={() => pick(r)}
              className={`flex items-center gap-2.5 rounded-[4px] border px-2 py-1.5 text-left hover:border-accent ${
                picked === r.productId ? "border-up bg-up/5" : "border-line-strong bg-surface"
              }`}
            >
              {r.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  className="h-10 w-7 shrink-0 rounded-[2px] object-cover"
                />
              )}
              <span className="min-w-0 flex-1 text-[12.5px] leading-snug">{r.name}</span>
              <span className="shrink-0 font-mono text-[10.5px] text-ink-3">#{r.productId}</span>
              {picked === r.productId && (
                <span className="shrink-0 font-mono text-[10.5px] text-up">เลือกแล้ว ↑</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
