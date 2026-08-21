import Link from "next/link";
import { CardArt } from "@/components/CardArt";
import { Chip, PriceTag } from "@/components/Chip";
import { formatBaht } from "@/lib/format";
import { HISTORY_DAYS } from "@/lib/seed";
import { getAdminStats, listAllSets, listCardsInSet, listMovers } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** ฟีเจอร์ที่ใช้งานได้จริงแล้ว — ห้ามใส่ของที่ยังไม่มีปนมาที่นี่ */
const FEATURES = [
  {
    title: "ราคาแยกตามเวอร์ชันและสภาพ",
    body: "การ์ดใบเดียวกัน Normal กับ Alt Art ราคาต่างกันได้สิบเท่า เราแยกให้ครบทุกเวอร์ชัน คูณด้วยสภาพการ์ดห้าระดับ",
    href: "/card/op01-120-shanks",
    cta: "ดูตัวอย่าง",
  },
  {
    title: "กราฟราคาย้อนหลัง",
    body: `เห็นราคาย้อนหลัง ${HISTORY_DAYS} วันของทุกเวอร์ชัน รู้ว่ากำลังขึ้นหรือกำลังลงก่อนตัดสินใจ`,
    href: "/card/op01-060-boa-hancock",
    cta: "ดูกราฟ",
  },
  {
    title: "จับการ์ดที่ราคาขยับแรง",
    body: "อันดับการ์ดที่ขึ้นและลงมากที่สุดในเจ็ดวัน อัปเดตตามข้อมูลจริงทุกครั้งที่มีการบันทึกราคา",
    href: "/movers",
    cta: "ดูอันดับ",
  },
  {
    title: "แยกฉบับ JP และ EN",
    body: "ชุดเดียวกันคนละภาษาคือคนละตลาดคนละราคา เราเก็บแยกกันตั้งแต่ต้น ไม่เอามารวมให้สับสน",
    href: "/browse",
    cta: "เลือกเกม",
  },
];

const UPCOMING = [
  "บันทึกคอลเลกชันของตัวเอง แล้วดูว่าเก็บครบชุดไปกี่เปอร์เซ็นต์",
  "มูลค่าพอร์ตย้อนหลังพร้อมกำไรขาดทุนเทียบราคาที่ซื้อ",
  "แจ้งเตือนผ่าน LINE เมื่อการ์ดที่หมายตาลงถึงราคาที่ตั้งไว้",
  "เพิ่มการ์ดด้วยการถ่ายรูป ไม่ต้องพิมพ์เลขการ์ดเอง",
];

export default function LandingPage() {
  const stats = getAdminStats();

  // ดึงการ์ดแพงสุดสามใบมาโชว์ ใช้ข้อมูลจริงในระบบ ไม่ใช่ภาพประกอบ
  const showcase = listAllSets()
    .flatMap((set) => listCardsInSet(set.code))
    .filter((row) => row.headline)
    .sort((a, b) => (b.headline?.priceThb ?? 0) - (a.headline?.priceThb ?? 0))
    .slice(0, 3);

  const movers = listMovers(3);

  const numbers = [
    { value: stats.cards.toLocaleString("th-TH"), label: "การ์ดในฐานข้อมูล" },
    { value: stats.variants.toLocaleString("th-TH"), label: "เวอร์ชันที่แยกราคา" },
    { value: stats.sets.toString(), label: "ชุดจาก 2 เกม" },
    { value: HISTORY_DAYS.toString(), label: "วันของราคาย้อนหลัง" },
  ];

  return (
    <div className="flex flex-col">
      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto grid w-full max-w-6xl gap-16 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="flex flex-col items-start gap-7">
          <p className="eyebrow">One Piece · Pokémon</p>

          <h1 className="max-w-[16ch] text-balance font-display text-[clamp(2.5rem,7vw,4.25rem)] font-semibold leading-[1.08] tracking-[-0.025em]">
            รู้ราคาการ์ดของคุณ <span className="text-gold">ก่อนจะซื้อหรือปล่อย</span>
          </h1>

          <p className="max-w-[48ch] text-[16.5px] leading-relaxed text-ink-2">
            ฐานข้อมูลราคาการ์ดสะสมสำหรับนักสะสมชาวไทย
            แยกราคาตามชุด เวอร์ชัน และสภาพการ์ดอย่างละเอียด พร้อมกราฟย้อนหลังให้เห็นแนวโน้ม
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/browse" className="btn btn-primary">
              เริ่มใช้งาน
            </Link>
            <Link href="/movers" className="btn btn-ghost">
              ดูราคาขยับแรง
            </Link>
          </div>

          <p className="text-[13px] text-ink-3">
            เปิดใช้ฟรี ไม่ต้องสมัครสมาชิก
          </p>
        </div>

        {/* การ์ดจริงสามใบที่แพงที่สุดในระบบ */}
        {showcase.length === 3 && (
          <div className="flex flex-col gap-6">
            <div className="fan grid grid-cols-3 gap-3 sm:gap-5">
              {showcase.map(({ card }) => (
                <Link key={card.id} href={`/card/${card.slug}`} className="group block">
                  <CardArt card={card} />
                </Link>
              ))}
            </div>

            <div className="vitrine flex flex-col gap-3 p-5">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
                ขยับแรงที่สุดใน 7 วัน
              </span>
              {movers.map((mover) => (
                <Link
                  key={mover.variant.id}
                  href={`/card/${mover.card.slug}`}
                  className="flex items-center justify-between gap-4 transition-colors hover:text-gold"
                >
                  <span className="min-w-0 truncate text-[13.5px]">{mover.card.nameTh}</span>
                  <PriceTag
                    priceThb={mover.price.priceThb}
                    change7d={mover.price.change7d}
                    size="sm"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---------------- ตัวเลขจริง ---------------- */}
      <section className="border-y border-line bg-surface/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-12 sm:px-8 lg:grid-cols-4">
          {numbers.map((item) => (
            <div key={item.label} className="flex flex-col gap-1.5">
              <span className="font-mono text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-none tabular-nums tracking-[-0.02em] text-gold">
                {item.value}
              </span>
              <span className="text-[13px] text-ink-2">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- ฟีเจอร์ ---------------- */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col gap-4">
          <p className="eyebrow">สิ่งที่ใช้งานได้แล้ววันนี้</p>
          <h2 className="max-w-[22ch] text-balance font-display text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-[1.12] tracking-[-0.02em]">
            ละเอียดพอที่จะเชื่อได้จริง
          </h2>
          <p className="max-w-[54ch] text-[15.5px] leading-relaxed text-ink-2">
            เว็บราคาการ์ดส่วนใหญ่บอกราคาเดียวต่อการ์ดหนึ่งใบ
            ซึ่งใช้ตัดสินใจซื้อขายจริงไม่ได้ เพราะราคาขึ้นกับเวอร์ชันและสภาพเสมอ
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group vitrine flex flex-col gap-4 p-7 transition-all duration-300 hover:border-gold-line hover:shadow-[var(--shadow-lift)]"
            >
              <h3 className="font-display text-[20px] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-gold">
                {feature.title}
              </h3>
              <p className="text-[14.5px] leading-relaxed text-ink-2">{feature.body}</p>
              <span className="mt-auto font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
                {feature.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- กำลังจะมา ---------------- */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="flex flex-col items-start gap-4">
            <Chip tone="gold">กำลังพัฒนา</Chip>
            <h2 className="max-w-[20ch] text-balance font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold leading-[1.14] tracking-[-0.02em]">
              ต่อไปคือคอลเลกชันของคุณเอง
            </h2>
            <p className="max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
              ตอนนี้เว็บยังเป็นฐานข้อมูลราคาอย่างเดียว
              เฟสถัดไปจะเปิดให้บันทึกการ์ดที่คุณมีจริง แล้วติดตามมูลค่าเหมือนดูพอร์ตลงทุน
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {UPCOMING.map((item) => (
              <li key={item} className="flex items-start gap-3.5 border-b border-line pb-4 last:border-0">
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                  aria-hidden="true"
                />
                <span className="text-[14.5px] leading-relaxed text-ink-2">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- ปิดท้าย ---------------- */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <div className="vitrine flex flex-col items-center gap-7 border-gold-line bg-gold-soft px-6 py-16 text-center sm:px-12">
          <h2 className="max-w-[18ch] text-balance font-display text-[clamp(1.9rem,5vw,2.75rem)] font-semibold leading-[1.12] tracking-[-0.02em]">
            เริ่มดูราคาการ์ดได้เลยตอนนี้
          </h2>
          <p className="max-w-[46ch] text-[15.5px] leading-relaxed text-ink-2">
            มีข้อมูล {stats.cards.toLocaleString("th-TH")} ใบจาก {stats.sets} ชุดให้ไล่ดู
            การ์ดที่แพงที่สุดในระบบตอนนี้อยู่ที่{" "}
            {showcase[0]?.headline ? formatBaht(showcase[0].headline.priceThb) : "—"}
          </p>
          <Link href="/browse" className="btn btn-primary">
            เริ่มใช้งาน
          </Link>
        </div>
      </section>
    </div>
  );
}
