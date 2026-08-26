import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ทางเข้า Supabase ทางเดียวของทั้งแอป
 *
 * ใช้ service role key และเรียกจากฝั่งเซิร์ฟเวอร์เท่านั้น — ทุกตารางเปิด RLS
 * ไว้โดยไม่มี policy เลย จึงไม่มีใครแตะข้อมูลได้ผ่านคีย์ฝั่งเบราว์เซอร์
 * ส่วนการตรวจว่าใครเป็นใครทำในโค้ดแอปเอง (ดู lib/session.ts)
 *
 * คีย์นี้ห้ามหลุดไปฝั่ง client เด็ดขาด ชื่อตัวแปรจึงไม่มี NEXT_PUBLIC_ นำหน้า
 * ซึ่ง Next.js จะไม่ฝังค่าลงบันเดิลของเบราว์เซอร์ให้
 *
 * ยังไม่ได้ตั้งค่า = คืน null แล้วโค้ดที่เรียกจะถอยไปใช้ Vercel Blob ต่อ
 * ทำให้ย้ายที่เก็บข้อมูลได้โดยเว็บไม่ต้องดับระหว่างทาง
 */

let client: SupabaseClient | null = null;

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export function usingSupabase(): boolean {
  return config() !== null;
}

export function db(): SupabaseClient | null {
  const settings = config();
  if (!settings) return null;

  // สร้างครั้งเดียวแล้วใช้ซ้ำ — ตัวไคลเอนต์ไม่มีสถานะของ request อยู่ข้างใน
  // (ปิด session ของ Auth ไว้ เพราะเราไม่ได้ใช้ Supabase Auth)
  //
  // ต้องยัด cache: "no-store" เข้าไปเองทุกคำขอ เพราะ supabase-js เรียก fetch()
  // ธรรมดาข้างใน ซึ่ง Next.js/Vercel แอบแคชให้โดยไม่บอก ไม่งั้นอ่านค่าที่เพิ่ง
  // เขียนไปหมาด ๆ กลับมาแล้วได้ของเก่าคืนมา (เจอจริงตอนผูกลิงก์การ์ดเป็นล็อต —
  // เขียนสำเร็จทุกใบแต่หน้าแดชบอร์ดอ่านไม่เห็นสักใบ)
  client ??= createClient(settings.url, settings.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });

  return client;
}

export const IMAGE_BUCKET = "card-images";
