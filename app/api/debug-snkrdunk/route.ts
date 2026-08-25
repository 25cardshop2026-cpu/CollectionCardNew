import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(
    "https://snkrdunk.com/en/v1/products/summaries?identifiers=SW---142584&identifiers=SW---104428",
    { headers: { accept: "application/json" }, cache: "no-store" },
  );
  return NextResponse.json({ status: res.status, body: await res.text() });
}
