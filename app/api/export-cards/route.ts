import { NextResponse } from "next/server";
import { listAllSets, listCardsInSet, loadState } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const debug = new URL(request.url).searchParams.get("debugSearch");
  if (debug) {
    const res = await fetch(
      `https://snkrdunk.com/en/v2/search?keyword=${encodeURIComponent(debug)}&page=1&perPage=20`,
      { headers: { accept: "application/json" }, cache: "no-store" },
    );
    return NextResponse.json({ status: res.status, body: await res.text() });
  }

  await loadState();
  const sets = listAllSets();
  const rows = sets.flatMap((set) =>
    listCardsInSet(set.code).map(({ card }) => ({
      id: card.id,
      setCode: card.setCode,
      number: card.number,
      nameEn: card.nameEn,
      nameTh: card.nameTh,
      variantType: card.variantType,
      snkrdunkCode: card.snkrdunkCode ?? null,
    })),
  );
  return NextResponse.json({ sets, rows });
}
