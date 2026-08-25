import { NextResponse } from "next/server";
import { listAllSets, listCardsInSet, loadState } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
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
