"use client";

import { useState } from "react";

/**
 * ปุ่มสั่งซิงก์ราคา SNKRDUNK ทันที — ไม่ต้องรอรอบ cron
 * ยิงไป endpoint เดียวกับที่ Vercel Cron เรียก แค่ทาง POST ไม่ต้องมี secret
 */
export function SnkrdunkSyncButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/cron/snkrdunk-prices", { method: "POST" });
      const data = (await res.json()) as {
        checked?: number;
        updated?: number;
        missing?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "ซิงก์ไม่สำเร็จ");

      const checked = data.checked ?? 0;
      if (checked === 0) {
        setMessage("ยังไม่มีการ์ดใบไหนผูกเลขสินค้า SNKRDUNK ไว้เลย");
      } else {
        const missed = data.missing?.length ?? 0;
        setMessage(
          `อัปเดตแล้ว ${data.updated ?? 0}/${checked} ใบ` +
            (missed > 0 ? ` — หาไม่เจอ ${missed} รหัส` : ""),
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
