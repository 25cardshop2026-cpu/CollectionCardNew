import { redirect } from "next/navigation";

/**
 * หน้าอัปเดตราคาถูกยุบรวมเข้าหน้าจัดการการ์ดแล้ว (ช่อง NM / PSA 10 / eBay /
 * SNKRDUNK อยู่ในแถวเดียวกับการ์ด) เหลือไว้เป็นทางผ่านเพื่อไม่ให้ลิงก์เก่าตาย
 */
export default async function AdminPricesPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>;
}) {
  const { set } = await searchParams;
  redirect(`/admin/cards${set ? `?set=${encodeURIComponent(set)}` : ""}`);
}
