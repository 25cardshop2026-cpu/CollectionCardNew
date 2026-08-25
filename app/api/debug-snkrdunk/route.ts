import { NextResponse } from "next/server";
import { fetchSnkrdunkLowestPrices } from "@/lib/snkrdunk";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchSnkrdunkLowestPrices(["142584", "104428"]);
  return NextResponse.json({
    prices: Object.fromEntries(result.prices),
    missing: result.missing,
  });
}
