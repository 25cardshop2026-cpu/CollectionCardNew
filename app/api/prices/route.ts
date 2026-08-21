import { NextResponse } from "next/server";
import { setPrice } from "@/lib/repo";
import { CONDITIONS, type Condition } from "@/lib/types";

export const dynamic = "force-dynamic";

function isCondition(value: unknown): value is Condition {
  return typeof value === "string" && (CONDITIONS as string[]).includes(value);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง" }, { status: 400 });
  }

  const { variantId, condition, priceThb } = (body ?? {}) as {
    variantId?: unknown;
    condition?: unknown;
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

  const updated = setPrice(variantId, condition, priceThb);
  if (!updated) {
    return NextResponse.json({ error: "ไม่พบเวอร์ชันการ์ดนี้" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
