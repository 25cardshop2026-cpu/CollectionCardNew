"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { deleteCardAction } from "@/lib/actions";

/**
 * ตารางจัดการการ์ดของทั้งชุด — เป็นหน้าเดียวที่ทำงานประจำวันได้ครบ
 *
 * แถวหนึ่ง = การ์ดหนึ่งใบ มีลิงก์ต้นทางอยู่ใต้ชื่อ (เปิดไปดูราคาจากต้นทาง)
 * แล้วกรอกราคากลับเข้ามาในช่อง NM / PSA 10 / eBay / SNKRDUNK ที่อยู่แถวเดียวกัน
 * ไม่ต้องสลับหน้าหรือสลับโหมดระหว่างกรอก
 *
 * ทุกช่องบันทึกทันทีที่กด Enter หรือคลิกออกจากช่อง ไม่มีปุ่มบันทึกรวม
 * เพราะการกรอกราคาทั้งชุดคือการไล่ทีละช่อง ไม่ใช่การกรอกฟอร์มแล้วส่งทีเดียว
 */

/** ช่องราคาสี่ช่องที่กรอกได้ เรียงตามลำดับคอลัมน์ในตาราง */
const PRICE_FIELDS = ["nm", "psa10", "ebay", "snkrdunk"] as const;

type PriceField = (typeof PRICE_FIELDS)[number];

const FIELD_LABEL: Record<PriceField, string> = {
  nm: "NM",
  psa10: "PSA 10",
  ebay: "eBay",
  snkrdunk: "SNKRDUNK",
};

/** ช่องกรอกแต่ละช่องหมายถึงเกรดไหนของช่องทางไหน — ใช้ตอนยิงไป /api/prices */
const FIELD_SOURCE: Record<PriceField, { condition: "NM" | "PSA10"; source: string }> = {
  nm: { condition: "NM", source: "market" },
  psa10: { condition: "PSA10", source: "market" },
  ebay: { condition: "NM", source: "ebay" },
  snkrdunk: { condition: "NM", source: "snkrdunk" },
};

export interface CardTableRow {
  cardId: string;
  variantId: string;
  slug: string;
  number: string;
  nameTh: string;
  nameEn: string;
  rarity: string;
  variantLabel: string;
  sourceUrl: string;
  prices: Record<PriceField, number | null>;
  /** ราคาตลาดหลักเก่ากี่วันแล้ว — null = ยังไม่เคยมีราคา */
  staleDays: number | null;
}

type Status = "idle" | "saving" | "saved" | "error";

/** ค่าที่ควรอยู่ในช่องกรอกตอนเปิดหน้า */
function initialPrices(rows: CardTableRow[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const row of rows) {
    for (const field of PRICE_FIELDS) {
      values[`${row.cardId}:${field}`] = row.prices[field]?.toString() ?? "";
    }
  }
  return values;
}

export function CardTable({ rows, setCode }: { rows: CardTableRow[]; setCode: string }) {
  /*
    เก็บสองชุดคู่กันทุกช่อง: ค่าที่พิมพ์อยู่ กับค่าที่เซิร์ฟเวอร์รับไปแล้ว
    ไว้เทียบว่าเปลี่ยนจริงไหมก่อนยิงบันทึก และไว้ตัดสินว่าช่องไหน "ยังไม่ถูกแตะ"
    ตอนที่เซิร์ฟเวอร์ส่งราคาชุดใหม่กลับมา
  */
  const [values, setValues] = useState<Record<string, string>>(() => initialPrices(rows));
  const [saved, setSaved] = useState<Record<string, string>>(() => initialPrices(rows));
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [links, setLinks] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.cardId, row.sourceUrl])),
  );
  const [savedLinks, setSavedLinks] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.cardId, row.sourceUrl])),
  );

  // ref ของช่องราคาทุกช่อง เพื่อให้ Enter / ลูกศรกระโดดไปแถวถัดไปในคอลัมน์เดิมได้
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const focusCell = (field: PriceField, index: number) => {
    const clamped = Math.max(0, Math.min(rows.length - 1, index));
    const target = inputs.current[`${rows[clamped]?.cardId}:${field}`];
    target?.focus();
    target?.select();
  };

  async function savePrice(row: CardTableRow, field: PriceField) {
    const key = `${row.cardId}:${field}`;
    const raw = (values[key] ?? "").trim();

    // ช่องว่างคือ "ยังไม่กรอก" ไม่ใช่ "ลบราคา" — ประวัติราคาลบไม่ได้อยู่แล้ว
    if (!raw || raw === (saved[key] ?? "")) return;

    const priceThb = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(priceThb) || priceThb <= 0) {
      setStatus((s) => ({ ...s, [key]: "error" }));
      setErrors((e) => ({ ...e, [key]: "ราคาต้องเป็นตัวเลขมากกว่า 0" }));
      return;
    }

    setStatus((s) => ({ ...s, [key]: "saving" }));
    setErrors((e) => ({ ...e, [key]: "" }));

    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: row.variantId, priceThb, ...FIELD_SOURCE[field] }),
      });
      const data = (await res.json()) as {
        prices?: Record<PriceField, number | null>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");

      setStatus((s) => ({ ...s, [key]: "saved" }));

      // เซิร์ฟเวอร์คืนราคาทั้งสี่ช่องมา เขียนทับเฉพาะช่องที่คนกรอกยังไม่ได้แตะ
      // ไม่งั้นตัวเลขที่กำลังพิมพ์อยู่ในอีกช่องจะถูกกลืนหายไปกลางคัน
      const next = data.prices;
      if (!next) return;

      setValues((current) => {
        const draft = { ...current };
        for (const other of PRICE_FIELDS) {
          const otherKey = `${row.cardId}:${other}`;
          const untouched = other === field || draft[otherKey] === (saved[otherKey] ?? "");
          if (untouched) draft[otherKey] = next[other]?.toString() ?? "";
        }
        return draft;
      });
      setSaved((current) => {
        const draft = { ...current };
        for (const other of PRICE_FIELDS) {
          draft[`${row.cardId}:${other}`] = next[other]?.toString() ?? "";
        }
        return draft;
      });
    } catch (err) {
      // เหตุผลจริงมาจากเซิร์ฟเวอร์ เช่นราคา PSA 10 ต่ำกว่าค่าส่งเกรด
      // ถ้าโชว์แค่ "บันทึกไม่สำเร็จ" คนกรอกจะไม่รู้ว่าต้องแก้อะไร
      setStatus((s) => ({ ...s, [key]: "error" }));
      setErrors((e) => ({
        ...e,
        [key]: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ",
      }));
    }
  }

  async function saveLink(row: CardTableRow) {
    const value = (links[row.cardId] ?? "").trim();
    if (value === (savedLinks[row.cardId] ?? "")) return;

    const key = `${row.cardId}:link`;
    setStatus((s) => ({ ...s, [key]: "saving" }));
    setErrors((e) => ({ ...e, [key]: "" }));

    try {
      const res = await fetch("/api/card-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: row.cardId, sourceUrl: value }),
      });
      const data = (await res.json()) as { sourceUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "บันทึกลิงก์ไม่สำเร็จ");

      // ใช้ลิงก์ที่ผ่านการตรวจจากเซิร์ฟเวอร์ ปุ่ม "เปิด" จะได้ชี้ไปที่เดียวกับที่บันทึกไว้
      const clean = data.sourceUrl ?? "";
      setLinks((s) => ({ ...s, [row.cardId]: clean }));
      setSavedLinks((s) => ({ ...s, [row.cardId]: clean }));
      setStatus((s) => ({ ...s, [key]: "saved" }));
    } catch (err) {
      setStatus((s) => ({ ...s, [key]: "error" }));
      setErrors((e) => ({
        ...e,
        [key]: err instanceof Error ? err.message : "บันทึกลิงก์ไม่สำเร็จ",
      }));
    }
  }

  /** เส้นขอบบอกผลการบันทึกของช่องนั้น ๆ โดยไม่ต้องมีข้อความเพิ่ม */
  function border(key: string): string {
    const state = status[key];
    if (state === "saved") return "border-up";
    if (state === "error") return "border-down";
    if (state === "saving") return "border-accent";
    return "border-line-strong";
  }

  const headClass =
    "px-3 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.07em] text-ink-3";

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-line">
              <th className={`${headClass} text-left`}>เลขการ์ด</th>
              <th className={`${headClass} text-left`}>ชื่อ · ลิงก์ต้นทาง</th>
              <th className={`${headClass} text-left`}>Rarity</th>
              <th className={`${headClass} text-left`}>เวอร์ชัน</th>
              {PRICE_FIELDS.map((field) => (
                <th
                  key={field}
                  className={`${headClass} text-right ${
                    // PSA 10 เป็นคนละตลาดกับการ์ดดิบ ใช้สีบอกแทนการตีกรอบแยก
                    field === "psa10" ? "text-accent" : ""
                  }`}
                >
                  {FIELD_LABEL[field]}
                </th>
              ))}
              <th className={headClass} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const linkKey = `${row.cardId}:link`;

              return (
                <tr
                  key={row.cardId}
                  className="border-b border-line last:border-0 align-top hover:bg-surface-2"
                >
                  <td className="px-3 py-2.5 font-mono text-[12px] whitespace-nowrap text-ink-3">
                    {row.number}
                  </td>

                  <td className="px-3 py-2.5">
                    {/* จำกัดความกว้างคอลัมน์ชื่อไว้ ไม่งั้นการ์ดที่ชื่อยาวมาก
                        จะดันช่องราคาหลุดออกนอกจอจนต้องเลื่อนตารางตลอดเวลา */}
                    <div className="flex w-[280px] flex-col gap-1.5">
                      <span className="leading-snug">
                        <Link href={`/card/${row.slug}`} className="hover:text-accent">
                          {row.nameTh}
                        </Link>
                        <span className="ml-2 text-[12px] text-ink-3">{row.nameEn}</span>
                      </span>

                      {/* ลิงก์ต้นทางอยู่ใต้ชื่อ: เปิดไปดูราคาแล้วกรอกกลับเข้าช่องข้าง ๆ ได้เลย */}
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={links[row.cardId] ?? ""}
                          onChange={(e) =>
                            setLinks((s) => ({ ...s, [row.cardId]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void saveLink(row);
                            }
                          }}
                          onBlur={() => void saveLink(row)}
                          placeholder="วางลิงก์ต้นทางราคา https://…"
                          aria-label={`ลิงก์ต้นทางราคาของ ${row.nameTh} ${row.variantLabel}`}
                          className={`w-full rounded-[3px] border bg-surface-2 px-2 py-1 text-[11.5px] focus:border-accent focus:bg-accent-soft ${border(linkKey)}`}
                        />
                        {savedLinks[row.cardId] ? (
                          <a
                            href={savedLinks[row.cardId]}
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

                      {errors[linkKey] && (
                        <span className="font-mono text-[10.5px] text-down">
                          {errors[linkKey]}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap text-ink-2">{row.rarity}</td>

                  <td className="px-3 py-2.5 text-[12px] whitespace-nowrap text-ink-3">
                    {row.variantLabel}
                  </td>

                  {PRICE_FIELDS.map((field) => {
                    const key = `${row.cardId}:${field}`;

                    return (
                      <td key={field} className="px-3 py-2.5 text-right">
                        <input
                          ref={(el) => {
                            inputs.current[key] = el;
                          }}
                          inputMode="numeric"
                          value={values[key] ?? ""}
                          onChange={(e) =>
                            setValues((v) => ({ ...v, [key]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void savePrice(row, field);
                              focusCell(field, index + 1);
                            } else if (e.key === "ArrowDown") {
                              e.preventDefault();
                              focusCell(field, index + 1);
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              focusCell(field, index - 1);
                            }
                          }}
                          onBlur={() => void savePrice(row, field)}
                          placeholder="—"
                          aria-label={`ราคา ${FIELD_LABEL[field]} ของ ${row.nameTh} ${row.variantLabel}`}
                          title={errors[key] || undefined}
                          className={`w-[88px] rounded-[3px] border bg-surface-2 px-2 py-1 text-right font-mono text-[12.5px] tabular-nums focus:border-accent focus:bg-accent-soft ${border(key)}`}
                        />
                        {errors[key] && (
                          <span className="mt-1 block font-mono text-[10.5px] leading-snug text-down">
                            {errors[key]}
                          </span>
                        )}

                        {/* บอกใต้ช่อง NM ว่าราคานี้เก่าแค่ไหน เพื่อให้เห็นว่าแถวไหน
                            ต้องไล่อัปเดตวันนี้ — ซ่อนทันทีที่แถวนี้ถูกบันทึกใหม่
                            ไม่งั้นจะกลายเป็นตัวเลขที่ขัดกับสิ่งที่เพิ่งทำไป */}
                        {field === "nm" &&
                          !errors[key] &&
                          status[key] !== "saved" &&
                          (row.staleDays === null ? (
                            <span className="mt-1 block font-mono text-[10px] text-ink-3">
                              ยังไม่มีราคา
                            </span>
                          ) : (
                            <span
                              className={`mt-1 block font-mono text-[10px] ${
                                row.staleDays > 7 ? "text-down" : "text-ink-3"
                              }`}
                            >
                              {row.staleDays === 0 ? "วันนี้" : `${row.staleDays} วันก่อน`}
                            </span>
                          ))}
                      </td>
                    );
                  })}

                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/cards/${row.cardId}`}
                        className="text-[12.5px] text-ink-3 hover:text-accent"
                      >
                        แก้ไข
                      </Link>
                      <form action={deleteCardAction}>
                        <input type="hidden" name="id" value={row.cardId} />
                        <input type="hidden" name="setCode" value={setCode} />
                        <button
                          type="submit"
                          className="text-[12.5px] text-ink-3 hover:text-down"
                        >
                          ลบ
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          "Enter บันทึก + ลงแถวถัดไป",
          "↑ ↓ เลื่อนแถวในคอลัมน์เดิม",
          "คลิกออกจากช่อง = บันทึก",
          "NM กับ PSA 10 เป็นราคาชุดเดียวกัน แก้ช่องหนึ่งอีกช่องขยับตาม",
        ].map((hint) => (
          <span
            key={hint}
            className="rounded-[3px] border border-line-strong px-2 py-[3px] font-mono text-[10.5px] text-ink-2"
          >
            {hint}
          </span>
        ))}
      </div>
    </div>
  );
}
