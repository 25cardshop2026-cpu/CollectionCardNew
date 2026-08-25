"use client";

import { useState } from "react";

const BATCH_LIMIT = 60;
/** กันลูปไม่รู้จบถ้าข้อมูลผิดปกติ — 60 ล็อต x 60 ใบ = 3,600 ใบต่อครั้งกด */
const MAX_ROUNDS = 60;

interface SyncResponse {
  checked?: number;
  remaining?: number;
  updated?: number;
  missing?: string[];
  error?: string;
}

/**
 * ปุ่มสั่งซิงก์ราคา SNKRDUNK ทันที — ไม่ต้องรอรอบ cron
 *
 * แคตตาล็อกมีเป็นพันใบ ซิงก์ทีเดียวหมดในคำขอเดียวไม่ทันเวลาที่ Vercel ให้ก่อน
 * ฟังก์ชันโดนตัด (เจอมาแล้วจริง ๆ —ตอบกลับมาเป็นหน้า error ธรรมดา ไม่ใช่ JSON
 * ทำให้ parse พังงงกันไปเลย) จึงยิงเป็นล็อตแทน วนเรียกซ้ำจนกว่าจะไม่มีคิวเหลือ
 */
export function SnkrdunkSyncButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function callOnce(): Promise<SyncResponse> {
    const res = await fetch(`/api/cron/snkrdunk-prices?limit=${BATCH_LIMIT}`, { method: "POST" });
    const text = await res.text();

    let data: SyncResponse;
    try {
      data = JSON.parse(text) as SyncResponse;
    } catch {
      // เซิร์ฟเวอร์ตอบกลับมาไม่ใช่ JSON (เช่นหน้า error ของ Vercel เอง)
      throw new Error(`เซิร์ฟเวอร์ตอบผิดปกติ (${res.status}) ลองใหม่อีกครั้ง`);
    }
    if (!res.ok) throw new Error(data.error ?? "ซิงก์ไม่สำเร็จ");
    return data;
  }

  async function run() {
    setStatus("loading");
    setMessage("");

    let totalChecked = 0;
    let totalUpdated = 0;
    let totalMissing = 0;

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const data = await callOnce();
        const checked = data.checked ?? 0;
        totalChecked += checked;
        totalUpdated += data.updated ?? 0;
        totalMissing += data.missing?.length ?? 0;

        if (checked === 0) break;

        setMessage(`กำลังซิงก์… อัปเดตแล้ว ${totalUpdated}/${totalChecked} ใบ`);

        if (!data.remaining) break;
      }

      if (totalChecked === 0) {
        setMessage("ยังไม่มีการ์ดใบไหนผูกเลขสินค้า SNKRDUNK ไว้เลย");
      } else {
        setMessage(
          `อัปเดตแล้ว ${totalUpdated}/${totalChecked} ใบ` +
            (totalMissing > 0 ? ` — หาไม่เจอ ${totalMissing} รหัส` : ""),
        );
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "ซิงก์ไม่สำเร็จ");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void run()}
        disabled={status === "loading"}
        className="rounded-[4px] border border-line-strong px-3 py-1.5 text-[13px] hover:border-accent hover:text-accent disabled:opacity-60"
      >
        {status === "loading" ? "กำลังซิงก์…" : "ซิงก์ราคา SNKRDUNK ตอนนี้"}
      </button>
      {message && (
        <span className={`text-[12px] ${status === "error" ? "text-down" : "text-ink-3"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
