/**
 * ส่งอีเมลผ่าน Resend
 *
 * เรียก REST API ตรงด้วย fetch ไม่ได้ลง SDK เพิ่ม เพราะใช้อยู่ปลายทางเดียว
 * และของที่ต้องส่งคืออีเมลข้อความล้วนฉบับเดียว ไม่ได้ต้องการอะไรมากกว่านั้น
 *
 * ยังไม่ได้ตั้ง RESEND_API_KEY = ส่งไม่ได้ ซึ่งไม่ใช่ข้อผิดพลาด — ฝั่งที่เรียก
 * จะเก็บลิงก์ไว้ให้แอดมินส่งต่อเองแทน (ดู lib/password-reset.ts)
 */

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  if (!mailConfigured()) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
