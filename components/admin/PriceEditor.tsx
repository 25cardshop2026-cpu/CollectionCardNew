"use client";

import { useRef, useState } from "react";

export interface PriceRow {
  variantId: string;
  cardId: string;
  /** ลิงก์หน้าที่ใช้ดูราคาของใบนี้ — ว่าง = ยังไม่ได้ผูกต้นทาง */
  sourceUrl: string;
  cardNumber: string;
  cardName: string;
  variantLabel: string;
  price: number | null;
  psaPrice: number | null;
  staleDays: number | null;
}

type RowStatus = "idle" | "saving" | "saved" | "error";

/** เกรดที่ราคาในช่องกรอกหมายถึง */
type Grade = "NM" | "PSA10";

const GRADE_LABEL: Record<Grade, string> = {
  NM: "ดิบ NM",
  PSA10: "PSA 10",
};

/** ช่องทางที่ราคาถูกบันทึกไว้ให้ — market คือราคาหลักที่โชว์บนหน้าเว็บ */
type Source = "market" | "ebay" | "snkrdunk";

const SOURCE_LABEL: Record<Source, string> = {
  market: "ตลาดไทย",
  ebay: "eBay",
  snkrdunk: "SNKRDUNK",
};

/**
 * ตารางอัปเดตราคาแบบ spreadsheet
 * หน้านี้คือหน้าที่แอดมินจะแตะทุกวัน จึงต้องทำงานด้วยคีย์บอร์ดล้วนได้
 * Enter = บันทึกแล้วลงแถวถัดไป · ↑ ↓ = เลื่อนแถว
 *
 * สลับเกรดได้ว่าราคาที่กรอกเป็นการ์ดดิบหรือใบเกรด PSA 10
 * ทั้งสองแบบเก็บลงฐานเดียวกัน เพราะราคาทุกอย่างอ้างอิงราคาดิบ NM
 * ฝั่งเซิร์ฟเวอร์เป็นคนถอดเบี้ยเกรดออกให้เอง
 */
export function PriceEditor({ rows }: { rows: PriceRow[] }) {
  const [grade, setGrade] = useState<Grade>("NM");
  const [source, setSource] = useState<Source>("market");
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(rows, "NM"));
  const [status, setStatus] = useState<Record<string, RowStatus>>({});
  const [saved, setSaved] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  /*
    ลิงก์ต้นทางแยกสถานะจากราคา เพราะบันทึกคนละที่ ไม่ได้ผูกกับเกรดหรือช่องทาง

    เก็บสองชุด: ค่าที่พิมพ์อยู่ในช่อง กับค่าที่เซิร์ฟเวอร์รับไปแล้ว
    ไว้เทียบว่าเปลี่ยนจริงไหมก่อนยิงบันทึก — เทียบกับ prop ตรง ๆ ไม่ได้
    เพราะหน้านี้ไม่ได้รีโหลดหลังบันทึก prop จึงค้างอยู่ที่ค่าตอนเปิดหน้า
  */
  const initialSources = () => Object.fromEntries(rows.map((r) => [r.cardId, r.sourceUrl]));
  const [sources, setSources] = useState<Record<string, string>>(initialSources);
  const [savedSources, setSavedSources] = useState<Record<string, string>>(initialSources);
  const [sourceErrors, setSourceErrors] = useState<Record<string, string>>({});

  async function saveSource(row: PriceRow) {
    const value = (sources[row.cardId] ?? "").trim();
    if (value === (savedSources[row.cardId] ?? "")) return;

    setSourceErrors((e) => ({ ...e, [row.cardId]: "" }));
    try {
      const res = await fetch("/api/card-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: row.cardId, sourceUrl: value }),
      });
      const data = (await res.json()) as { sourceUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกลิงก์ไม่สำเร็จ");

      // เซิร์ฟเวอร์คืนลิงก์ที่ผ่านการตรวจแล้ว ใช้ค่านั้นทั้งในช่องและปุ่ม "เปิด"
      // ปุ่มจะได้ชี้ไปที่เดียวกับที่บันทึกไว้จริง
      const clean = data.sourceUrl ?? "";
      setSources((s) => ({ ...s, [row.cardId]: clean }));
      setSavedSources((s) => ({ ...s, [row.cardId]: clean }));
    } catch (err) {
      setSourceErrors((e) => ({
        ...e,
        [row.cardId]: err instanceof Error ? err.message : "บันทึกลิงก์ไม่สำเร็จ",
      }));
    }
  }

  const shownPrice = (row: PriceRow) => (grade === "PSA10" ? row.psaPrice : row.price);

  function switchSource(next: Source) {
    setSource(next);
    // ช่องทางอื่นยังไม่มีราคาเดิมส่งมาจากเซิร์ฟเวอร์ จึงเริ่มจากช่องว่าง
    setValues(next === "market" ? initialValues(rows, grade) : {});
    setStatus({});
    setSaved({});
    setErrors({});
  }

  function switchGrade(next: Grade) {
    setGrade(next);
    // เติมค่าในช่องใหม่ตามเกรดที่เลือก ไม่งั้นตัวเลขที่ค้างอยู่จะกลายเป็นคนละความหมาย
    setValues(source === "market" ? initialValues(rows, next) : {});
    setStatus({});
    setSaved({});
    setErrors({});
  }

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
      setErrors((e) => ({ ...e, [row.variantId]: "ราคาต้องเป็นตัวเลขมากกว่า 0" }));
      return;
    }
    if (source === "market" && priceThb === shownPrice(row)) return;

    setStatus((s) => ({ ...s, [row.variantId]: "saving" }));
    setErrors((e) => ({ ...e, [row.variantId]: "" }));

    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: row.variantId,
          condition: grade,
          priceThb,
          source,
        }),
      });
      const data = (await res.json()) as { priceThb?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");

      setStatus((s) => ({ ...s, [row.variantId]: "saved" }));
      setSaved((s) => ({ ...s, [row.variantId]: data.priceThb ?? 0 }));
    } catch (err) {
      // เหตุผลจริงมาจากเซิร์ฟเวอร์ เช่นราคา PSA 10 ต่ำกว่าค่าส่งเกรด
      // ถ้าโชว์แค่ "บันทึกไม่สำเร็จ" คนกรอกจะไม่รู้ว่าต้องแก้อะไร
      setStatus((s) => ({ ...s, [row.variantId]: "error" }));
      setErrors((e) => ({
        ...e,
        [row.variantId]: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ",
      }));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
          ราคาที่กรอกคือ
        </span>
        {(["NM", "PSA10"] as Grade[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchGrade(value)}
            aria-pressed={grade === value}
            className={`rounded-[3px] border px-2.5 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.06em] ${
              grade === value
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-ink-2 hover:border-accent hover:text-accent"
            }`}
          >
            {GRADE_LABEL[value]}
          </button>
        ))}
        {grade === "PSA10" && (
          <span className="text-[12px] text-ink-3">
            ระบบจะถอดเบี้ยเกรดออกแล้วเก็บเป็นราคาดิบให้เอง
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
          ช่องทาง
        </span>
        {(["market", "ebay", "snkrdunk"] as Source[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchSource(value)}
            aria-pressed={source === value}
            className={`rounded-[3px] border px-2.5 py-[3px] font-mono text-[10.5px] uppercase tracking-[0.06em] ${
              source === value
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-ink-2 hover:border-accent hover:text-accent"
            }`}
          >
            {SOURCE_LABEL[value]}
          </button>
        ))}
        <span className="text-[12px] text-ink-3">
          {source === "market"
            ? "ราคาหลักที่โชว์เป็นตัวใหญ่บนหน้าการ์ด"
            : "โชว์แยกในกล่องราคาตามช่องทาง ไม่กระทบราคาหลัก"}
        </span>
      </div>

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
              <th className="px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                ต้นทาง
              </th>
              <th className="px-3 py-2.5 text-right font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3">
                ราคา {GRADE_LABEL[grade]} · {SOURCE_LABEL[source]} (บาท)
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
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={sources[row.cardId] ?? ""}
                        onChange={(e) =>
                          setSources((s) => ({ ...s, [row.cardId]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveSource(row);
                          }
                        }}
                        onBlur={() => void saveSource(row)}
                        placeholder="https://…"
                        aria-label={`ลิงก์ต้นทางราคาของ ${row.cardName} ${row.variantLabel}`}
                        className="w-40 rounded-[3px] border border-line-strong bg-surface-2 px-2 py-1 text-[12px] focus:border-accent focus:bg-accent-soft"
                      />
                      {savedSources[row.cardId] ? (
                        <a
                          href={savedSources[row.cardId]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.06em] text-accent hover:underline"
                        >
                          เปิด ↗
                        </a>
                      ) : (
                        <span className="shrink-0 font-mono text-[10.5px] text-ink-3">—</span>
                      )}
                    </div>
                    {sourceErrors[row.cardId] && (
                      <span className="mt-1 block font-mono text-[10.5px] text-down">
                        {sourceErrors[row.cardId]}
                      </span>
                    )}
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
                      aria-label={`ราคา ${GRADE_LABEL[grade]} จาก ${SOURCE_LABEL[source]} ของ ${row.cardName} ${row.variantLabel}`}
                      className="w-28 rounded-[3px] border border-line-strong bg-surface-2 px-2 py-1 text-right font-mono tabular-nums focus:border-accent focus:bg-accent-soft"
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
                      <span className="text-down">
                        {errors[row.variantId] || "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง"}
                      </span>
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

/** ค่าเริ่มต้นในช่องกรอก อ่านจากราคาปัจจุบันของเกรดที่เลือกอยู่ */
function initialValues(rows: PriceRow[], grade: Grade): Record<string, string> {
  return Object.fromEntries(
    rows.map((row) => [
      row.variantId,
      (grade === "PSA10" ? row.psaPrice : row.price)?.toString() ?? "",
    ]),
  );
}
