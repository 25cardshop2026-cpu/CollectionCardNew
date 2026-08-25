import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const attempts: { label: string; headers: Record<string, string> }[] = [
    { label: "accept-language th", headers: { accept: "application/json", "accept-language": "th-TH,th;q=0.9" } },
    { label: "x-country TH", headers: { accept: "application/json", "x-country": "TH", "x-currency": "THB" } },
    { label: "cookie country", headers: { accept: "application/json", cookie: "country=TH; currency=THB; NEXT_LOCALE=th" } },
  ];

  const results: Record<string, string> = {};
  for (const a of attempts) {
    const res = await fetch(
      "https://snkrdunk.com/en/v1/trading-cards/142584/min-prices-by-conditions",
      { headers: a.headers, cache: "no-store" },
    );
    results[a.label] = await res.text();
  }
  return NextResponse.json(results);
}
