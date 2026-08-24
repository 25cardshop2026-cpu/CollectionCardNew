/**
 * รหัสผ่านและคุกกี้เซสชันของผู้ใช้
 *
 * ใช้ Web Crypto ล้วน ๆ ไม่พึ่ง node:crypto และไม่พึ่งไลบรารีภายนอก
 * เพราะโค้ดชุดนี้ต้องรันได้ทั้งบน Node runtime และ Edge runtime (middleware)
 *
 * คุกกี้เก็บแค่ "ผู้ใช้คนไหน หมดอายุเมื่อไหร่" กับลายเซ็น HMAC ของสองค่านั้น
 * จึงปลอมไม่ได้ถ้าไม่รู้ความลับ และไม่ต้องเก็บตารางเซสชันฝั่งเซิร์ฟเวอร์เลย
 */

export const SESSION_COOKIE = "cc_user";
const SESSION_DAYS = 30;

/** PBKDF2 รอบเยอะพอให้เดารหัสผ่านทีละใบแพง แต่ยังไม่ถ่วง request ที่ล็อกอิน */
const PBKDF2_ITERATIONS = 210_000;

/**
 * ความลับที่ใช้เซ็นคุกกี้
 *
 * ลำดับความสำคัญ: AUTH_SECRET ที่ตั้งเอง → โทเคนของ Blob (เป็นความลับที่แรง
 * และมีอยู่แล้วบนเซิร์ฟเวอร์จริง) → ค่าคงที่สำหรับรันในเครื่องตอนพัฒนา
 *
 * ข้อแลกเปลี่ยนของทางเลือกที่สอง: ถ้าหมุนโทเคนของ Blob ทุกคนจะถูกเด้งออกจาก
 * ระบบ ซึ่งยอมรับได้ แลกกับการที่เว็บจริงไม่มีวันตกไปใช้ความลับของ dev
 */
function secret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    "collection-card-dev-secret"
  );
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** เทียบแบบใช้เวลาคงที่ ไม่ให้เดาทีละตัวอักษรจากเวลาที่ตอบกลับ */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- รหัสผ่าน ----------

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

/**
 * เก็บเป็น "pbkdf2$รอบ$เกลือ$แฮช" — จำนวนรอบติดไปกับแฮชด้วย
 * วันที่ขึ้นจำนวนรอบในอนาคต รหัสผ่านเก่าจึงยังตรวจได้เหมือนเดิม
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt.buffer as ArrayBuffer)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;

  const computed = await derive(password, fromHex(salt), Number(iterations));
  return equals(computed, hash);
}

// ---------- เซสชัน ----------

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return toHex(signature);
}

export interface SessionCookie {
  value: string;
  maxAge: number;
}

export async function createSession(userId: string): Promise<SessionCookie> {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const payload = `${userId}.${Date.now() + maxAge * 1000}`;
  return { value: `${payload}.${await sign(payload)}`, maxAge };
}

/** คืน id ของผู้ใช้ถ้าคุกกี้ยังใช้ได้ ไม่งั้นคืน null */
export async function readSession(cookie: string | undefined): Promise<string | null> {
  if (!cookie) return null;

  // id ของผู้ใช้ไม่มีจุด จึงตัดจากท้ายได้ตรง ๆ
  const parts = cookie.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiresAt, signature] = parts;
  if (!userId || !expiresAt || !signature) return null;
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) < Date.now()) return null;

  return equals(signature, await sign(`${userId}.${expiresAt}`)) ? userId : null;
}

/** ตัวเลือกคุกกี้ที่ใช้ร่วมกันทั้งตอนล็อกอินและตอนออกจากระบบ */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;
