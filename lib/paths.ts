/**
 * path ที่ปลอดภัยพอจะเอาไป redirect ต่อ
 *
 * ฟอร์มหลายที่ในเว็บพก "หน้าที่จะกลับไป" ติดไปกับข้อมูลที่ส่ง ซึ่งแปลว่าใครก็
 * ยัดค่ามาเองได้ จึงรับเฉพาะ path ในเว็บเรา และต้องไม่ขึ้นต้นด้วย //
 * เพราะเบราว์เซอร์อ่าน //example.com เป็นโดเมนอื่น ไม่ใช่ path ของเรา
 */
export function safePath(wanted: string, fallback: string): string {
  return wanted.startsWith("/") && !wanted.startsWith("//") ? wanted : fallback;
}
