"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * ช่องเลือกรูปที่รับได้สามทาง: วางด้วย Ctrl+V · ลากไฟล์มาวาง · เลือกไฟล์เอง
 *
 * ทั้งสามทางลงเอยที่ input type=file ตัวเดียวกัน ฟอร์มจึงยังเป็นฟอร์มธรรมดา
 * ที่ส่งเข้า server action เหมือนเดิม ไม่ต้องมีเส้นทางอัปโหลดแยกสำหรับรูปที่วาง
 *
 * ดักวางที่ระดับหน้าต่าง เพราะเวลาก๊อปรูปมาคนมักกด Ctrl+V ทันทีโดยไม่คลิกช่องก่อน
 * แต่ถ้ามีหลายช่องในหน้าเดียว (หน้าตั้งค่าหน้าแรกมีสามใบ) การรับทุกช่องพร้อมกัน
 * แปลว่ารูปเดียวจะไปโผล่ทุกการ์ด จึงต้องคลิกเลือกช่องก่อนหนึ่งครั้ง
 */

// นับจำนวนช่องที่อยู่บนหน้าจอ และจำว่าช่องไหนถูกเลือกไว้ — ใช้ร่วมกันทุก instance
let mountedPickers = 0;
let activePicker: string | null = null;
const ARMED_EVENT = "cc:picker-armed";

export function ImagePicker({ name }: { name: string }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false);
  const [alone, setAlone] = useState(true);

  useEffect(() => {
    mountedPickers += 1;
    setAlone(mountedPickers === 1);
    window.dispatchEvent(new Event(ARMED_EVENT));

    return () => {
      mountedPickers -= 1;
      if (activePicker === id) activePicker = null;
    };
  }, [id]);

  useEffect(() => {
    function sync() {
      setArmed(activePicker === id);
      setAlone(mountedPickers === 1);
    }

    window.addEventListener(ARMED_EVENT, sync);
    return () => window.removeEventListener(ARMED_EVENT, sync);
  }, [id]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function arm() {
    activePicker = id;
    window.dispatchEvent(new Event(ARMED_EVENT));
  }

  function accept(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;

    // ยัดไฟล์กลับเข้า input จริง ๆ เพื่อให้ฟอร์มส่งไปได้ตามปกติ
    const carrier = new DataTransfer();
    carrier.items.add(file);
    if (inputRef.current) inputRef.current.files = carrier.files;

    setPreview((old) => {
      if (old) URL.revokeObjectURL(old.url);
      const kb = Math.round(file.size / 1024).toLocaleString("th-TH");
      return { url: URL.createObjectURL(file), label: `${file.name || "รูปที่วาง"} · ${kb} KB` };
    });
  }

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      // ช่องเดียวในหน้า = รับเลย · หลายช่อง = รับเฉพาะช่องที่คลิกเลือกไว้
      if (mountedPickers > 1 && activePicker !== id) return;

      const item = [...(event.clipboardData?.items ?? [])].find((entry) =>
        entry.type.startsWith("image/"),
      );
      if (!item) return;

      event.preventDefault();
      accept(item.getAsFile());
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [id]);

  const ready = alone || armed;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onFocus={arm}
        onMouseDown={arm}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
          dragging || ready
            ? "border-accent bg-accent-soft"
            : "border-line-strong hover:border-accent hover:bg-surface-2"
        }`}
      >
        <span className="font-mono text-[11px] tracking-[0.08em] text-accent uppercase">
          Ctrl + V
        </span>
        <span className="text-[13px] text-ink-2">
          {ready ? "วางรูปที่ก๊อปไว้ได้เลย" : "คลิกที่นี่ก่อน แล้วค่อยกด Ctrl+V"}
        </span>
        <span className="text-[12px] text-ink-3">หรือลากไฟล์มาวาง · หรือคลิกเพื่อเลือกไฟล์</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/png,image/jpeg,image/webp,image/avif"
        required
        aria-label="ไฟล์รูปการ์ด"
        onChange={(e) => accept(e.target.files?.[0])}
        className="sr-only"
      />

      {preview && (
        <div className="flex items-center gap-3 rounded-lg border border-accent-line bg-accent-soft p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt="ตัวอย่างรูปที่เลือก"
            className="h-16 w-auto rounded-[4px] border border-line-strong"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[12.5px] text-accent">พร้อมอัปโหลด</span>
            <span className="truncate text-[12px] text-ink-3">{preview.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
