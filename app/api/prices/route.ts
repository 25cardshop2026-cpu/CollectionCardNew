import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { canPersist, getAdminPrices, loadState, setPrice } from "@/lib/repo";
import { CHANNELS, CONDITIONS, type Condition, type PriceSource } from "@/lib/types";

export const dynamic = "force-dynamic";

function isCondition(value: unknown): value is Condition {
  return typeof value === "string" && (CONDITIONS as string[]).includes(value);
}

export async function POST(request: Request) {
  // API นี้เขียนราคาจริงของเว็บ ใครยิงตรงเข้ามาก็ต้องผ่านด่านเดียวกับแดชบอร์ด
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง" }, { status: 400 });
  }

  const { variantId, condition, priceThb, source } = (body ?? {}) as {
    variantId?: unknown;
    condition?: unknown;
    source?: unknown;
    priceThb?: unknown;
  };

  if (typeof variantId !== "string" || !variantId) {
    return NextResponse.json({ error: "ต้องระบุ variantId" }, { status: 400 });
  }
  if (!isCondition(condition)) {
    return NextResponse.json(
      { error: `condition ต้องเป็นค่าใดค่าหนึ่งใน ${CONDITIONS.join(", ")}` },
      { status: 400 },
    );
  }
  if (typeof priceThb !== "number" || !Number.isFinite(priceThb) || priceThb <= 0) {
    return NextResponse.json({ error: "ราคาต้องเป็นตัวเลขมากกว่า 0" }, { status: 400 });
  }

  if (!canPersist()) {
    return NextResponse.json(
      {
        error:
          "บันทึกไม่ได้ในสภาพแวดล้อมนี้ เพราะดิสก์เขียนไม่ได้ ต้องต่อฐานข้อมูลจริงก่อน",
      },
      { status: 503 },
    );
  }

  // ต้องโหลดสถานะก่อน เพราะ setPrice ตรวจว่ามี variant นี้จริงไหมจากดัชนีในหน่วยความจำ
  // ไม่ระบุช่องทาง = ราคาตลาดหลัก เหมือนพฤติกรรมเดิมก่อนมีช่องทาง
  const channel: PriceSource =
    typeof source === "string" && (CHANNELS as readonly string[]).includes(source)
      ? (source as PriceSource)
      : "market";

  await loadState();
  const result = await setPrice(variantId, condition, priceThb, channel);
  if (!result.ok) {
    // แยก "ไม่มีการ์ดนี้" ออกจาก "ราคาที่กรอกใช้ไม่ได้" เพราะคนแก้คนละทาง
    const notFound = result.error.includes("ไม่พบ");
    return NextResponse.json({ error: result.error }, { status: notFound ? 404 : 400 });
  }

  /*
    คืนราคาทั้งสี่ช่องของการ์ดใบนี้กลับไปด้วย ไม่ใช่แค่ช่องที่เพิ่งบันทึก

    เพราะ NM กับ PSA 10 เป็นราคาชุดเดียวกันคนละมุมมอง กรอกช่องหนึ่งอีกช่อง
    ต้องขยับตามทันที ตารางในแดชบอร์ดโชว์ทั้งสองช่องพร้อมกันโดยไม่รีโหลดหน้า
    ถ้าไม่ส่งค่าใหม่กลับไป ตัวเลขบนจอจะขัดกันเองจนคนกรอกไม่รู้ว่าอันไหนจริง
  */
  return NextResponse.json({ ...result.value, prices: getAdminPrices(variantId) });
}
