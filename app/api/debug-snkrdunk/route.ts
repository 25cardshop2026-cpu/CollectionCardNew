import { NextResponse } from "next/server";
import { fetchSnkrdunkPrices } from "@/lib/snkrdunk";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchSnkrdunkPrices(["104428", "142586"]);
  return NextResponse.json({
    nm: Object.fromEntries(result.nm),
    psa10: Object.fromEntries(result.psa10),
    missing: result.missing,
  });
}
