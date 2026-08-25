import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url =
    "https://snkrdunk.com/en/v1/trading-cards/142584/min-prices-by-conditions?currency=THB&country=TH";
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  return NextResponse.json({
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: text,
  });
}
