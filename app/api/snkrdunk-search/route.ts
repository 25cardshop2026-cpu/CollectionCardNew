import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RankingProduct {
  productType?: string;
  productTypeGB?: string;
  code?: string;
  name?: string;
  link?: string;
  thumbnailUrl?: string;
}

interface SearchResponse {
  search?: { rankingProducts?: RankingProduct[] };
}

const CODE_PREFIX = "SW---";

/**
 * ค้นหาสินค้าจาก SNKRDUNK แทนแอดมิน — ไม่ให้เบราว์เซอร์ยิงตรงเพราะโดน CORS บล็อก
 * เอาเฉพาะการ์ดใบเดี่ยว (tradingCardSingle) มาโชว์ ตัดพวกกล่อง/แพ็คออก
 */
export async function GET(request: Request) {
  const keyword = new URL(request.url).searchParams.get("q")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "ต้องระบุคำค้นหา" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://snkrdunk.com/en/v2/search?keyword=${encodeURIComponent(keyword)}&page=1&perPage=20`,
      { headers: { accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return NextResponse.json({ error: "ค้นหาไม่สำเร็จ" }, { status: 502 });

    const data = (await res.json()) as SearchResponse;
    const results = (data.search?.rankingProducts ?? [])
      .filter((p) => p.productTypeGB === "tradingCardSingle" && p.code?.startsWith(CODE_PREFIX))
      .map((p) => ({
        productId: p.code!.slice(CODE_PREFIX.length),
        name: p.name ?? "",
        thumbnailUrl: p.thumbnailUrl ?? "",
        link: `https://snkrdunk.com/en/trading-cards/${p.code!.slice(CODE_PREFIX.length)}`,
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "ค้นหาไม่สำเร็จ" }, { status: 502 });
  }
}
