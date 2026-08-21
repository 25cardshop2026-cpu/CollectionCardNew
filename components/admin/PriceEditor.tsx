"use client";

import { useRef, useState } from "react";

export interface PriceRow {
  variantId: string;
  cardNumber: string;
  cardName: string;
  variantLabel: string;
  price: number | null;
  staleDays: number | null;
}

type RowStatus = "idle" | "saving" | "saved" | "error";

/**
 * ตารางอัปเดตราคาแบบ spreadsheet
 * หน้านี้คือหน้าที่แอดมินจะแตะทุกวัน จึงต้องทำงานด้วยคีย์บอร์ดล้วนได้
 * Enter = บันทึกแล้วลงแถวถัดไป · ↑ ↓ = เลื่อนแถว
 */
export function PriceEditor({ rows }: { rows: PriceRow[] }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.variantId, r.price?.toString() ?? ""])),
  );
  const [status, setStatus] = useState<Record<string, RowStatus>>({});
  const [saved, setSaved] = useState<Record<string, number>>({});
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focusRow = (index: number) => {
    const target = inputs.current[Math.max(0, Math.min(rows.length - 1, index))];
    target?.focus();
    target?.select();
  };

  async function save(row: PriceRow) {
    const raw = values[row.variantId]?.trim();
    if (!raw) return;

    const priceThb = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(priceThb) || priceThb <= 0) {
      setStatus((s) => ({ ...s, [row.variantId]: "error" }));
      return;
    }
    if (priceThb === row.price) return;

    setStatus((s) => ({ ...s, [row.variantId]: "saving" }));

    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: row.variantId, condition: "NM", priceThb }),
      });
      if (!res.ok) throw new Error(await res.text());

      const data = (await res.json()) as { priceThb: number };
      setStatus((s) => ({ ...s, [row.variantId]: "saved" }));
      setSaved((s) => ({ ...s, [row.variantId]: data.priceThb }));
    } catch {
      setStatus((s) => ({ ...s, [row.variantId]: "error" }));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line">
              <th className="px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                เลขการ์ด
              </th>
              <th className="px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                การ์ด
              </th>
              <th className="px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                เวอร์ชัน
              </th>
              <th className="px-3 py-2.5 text-right font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                ราคา NM (บาท)
              </th>
              <th className="px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                สถานะ
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowStatus = status[row.variantId] ?? "idle";
              const isStale = (row.staleDays ?? 0) > 7;

              return (
                <tr
                  key={row.variantId}
                  className="border-b border-line last:border-0 hover:bg-surface-2"
                >
                  <td className="px-3 py-2 font-mono text-[12px] text-ink-3 whitespace-nowrap">
                    {row.cardNumber}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.cardName}</td>
                  <td className="px-3 py-2 text-ink-2 whitespace-nowrap">
                    {row.variantLabel}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      ref={(el) => {
                        inputs.current[index] = el;
                      }}
                      inputMode="numeric"
                      value={values[row.variantId] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [row.variantId]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void save(row);
                          focusRow(index + 1);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          focusRow(index + 1);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          focusRow(index - 1);
                        }
                      }}
                      onBlur={() => void save(row)}
                      aria-label={`ราคาของ ${row.cardName} ${row.variantLabel}`}
                      className="w-28 rounded-[3px] border border-line-strong bg-surface-2 px-2 py-1 text-right font-mono tabular-nums focus:border-gold focus:bg-gold-soft"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-[11.5px]">
                    {rowStatus === "saving" && <span className="text-ink-3">กำลังบันทึก…</span>}
                    {rowStatus === "saved" && (
                      <span className="text-up">
                        บันทึกแล้ว
                        {saved[row.variantId] !== undefined &&
                          ` · ฿${saved[row.variantId].toLocaleString("th-TH")}`}
                      </span>
                    )}
                    {rowStatus === "error" && (
                      <span className="text-down">บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง</span>
                    )}
                    {rowStatus === "idle" &&
                      (isStale ? (
                        <span className="text-down">ค้าง {row.staleDays} วัน</span>
                      ) : (
                        <span className="text-ink-3">
                          {row.staleDays === null ? "ยังไม่มีราคา" : `${row.staleDays} วันก่อน`}
                        </span>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        {["Enter บันทึก + ลงแถวถัดไป", "↑ ↓ เลื่อนแถว", "คลิกออกจากช่อง = บันทึก"].map(
          (hint) => (
            <span
              key={hint}
              className="rounded-[3px] border border-line-strong px-2 py-[3px] font-mono text-[10.5px] text-ink-2"
            >
              {hint}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
