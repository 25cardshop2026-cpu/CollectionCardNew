import Link from "next/link";
import { notFound } from "next/navigation";
import { CardArt } from "@/components/CardArt";
import { Chip, PriceTag } from "@/components/Chip";
import { formatBaht, formatNumber } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { getAdminStats, listAllSets, listCardsInSet, listMovers, loadState } from "@/lib/repo";
import { HISTORY_DAYS } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await loadState();
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const stats = getAdminStats();

  // ดึงการ์ดแพงสุดสามใบมาโชว์ ใช้ข้อมูลจริงในระบบ ไม่ใช่ภาพประกอบ
  const showcase = listAllSets()
    .flatMap((set) => listCardsInSet(set.code))
    .filter((row) => row.headline)
    .sort((a, b) => (b.headline?.priceThb ?? 0) - (a.headline?.priceThb ?? 0))
    .slice(0, 3);

  const movers = listMovers(3);

  // ลิงก์การ์ดต้องมาจากของที่มีจริงในระบบ ไม่ใช่เลขการ์ดที่พิมพ์ทิ้งไว้
  // เพราะแคตตาล็อกเปลี่ยนได้ทุกครั้งที่ดึงข้อมูลใหม่ แล้วลิงก์ตายจะไม่มีใครรู้
  const featureLinks = [
    showcase[0] ? p(`/card/${showcase[0].card.slug}`) : p("/browse"),
    showcase[1] ? p(`/card/${showcase[1].card.slug}`) : p("/browse"),
    p("/movers"),
    p("/browse"),
  ];

  const numbers = [
    { value: formatNumber(stats.cards, locale), label: t.landing.statCards },
    { value: formatNumber(stats.variants, locale), label: t.landing.statVariants },
    { value: stats.sets.toString(), label: t.landing.statSets },
    { value: HISTORY_DAYS.toString(), label: t.landing.statHistory },
  ];

  return (
    <div className="flex flex-col">
      {/* ---------------- Hero ----------------
          ห่อด้วย div เต็มความกว้างเพื่อให้ตารางขอบฟ้าลากยาวสุดจอ
          ไม่ถูกบีบอยู่ในคอลัมน์ max-w-6xl ของเนื้อหา */}
      <div className="relative overflow-hidden">
        <div className="grid-floor" aria-hidden="true" />

        <section className="relative mx-auto grid w-full max-w-6xl gap-16 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="flex flex-col items-start gap-7">
          <p className="eyebrow flex items-center gap-2.5">
            <span className="pulse-dot" aria-hidden="true" />
            {t.landing.eyebrow}
          </p>

          <h1 className="max-w-[19ch] text-balance font-display text-[clamp(2.5rem,7vw,4.25rem)] font-semibold leading-[1.08] tracking-[-0.025em]">
            {t.landing.headlineLead}{" "}
            <span className="neon-text">{t.landing.headlineAccent}</span>
          </h1>

          <p className="max-w-[48ch] text-[16.5px] leading-relaxed text-ink-2">
            {t.landing.sub}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href={p("/browse")} className="btn btn-primary">
              {t.landing.ctaPrimary}
            </Link>
            <Link href={p("/movers")} className="btn btn-ghost">
              {t.landing.ctaSecondary}
            </Link>
          </div>

          <p className="text-[13px] text-ink-3">{t.landing.freeNote}</p>
        </div>

        {/* การ์ดจริงสามใบที่แพงที่สุดในระบบ */}
        {showcase.length === 3 && (
          <div className="flex flex-col gap-6">
            <div className="fan grid grid-cols-3 gap-3 sm:gap-5">
              {showcase.map(({ card }) => (
                <Link key={card.id} href={p(`/card/${card.slug}`)} className="group block">
                  <CardArt card={card} />
                </Link>
              ))}
            </div>

            <div className="vitrine hud flex flex-col gap-3 p-5">
              <span className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-accent">
                <span className="pulse-dot" aria-hidden="true" />
                {t.landing.showcaseLabel}
              </span>
              {movers.map((mover) => (
                <Link
                  key={mover.variant.id}
                  href={p(`/card/${mover.card.slug}`)}
                  className="flex items-center justify-between gap-4 transition-colors hover:text-accent"
                >
                  <span className="min-w-0 truncate text-[13.5px]">
                    {locale === "th" ? mover.card.nameTh : mover.card.nameEn}
                  </span>
                  <PriceTag
                    priceThb={mover.price.priceThb}
                    change7d={mover.price.change7d}
                    size="sm"
                    locale={locale}
                  />
                </Link>
              ))}
            </div>
          </div>
        )}
        </section>
      </div>

      {/* ---------------- ตัวเลขจริง ---------------- */}
      <section className="border-y border-line bg-surface/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-12 sm:gap-5 sm:px-8 lg:grid-cols-4">
          {numbers.map((item) => (
            <div key={item.label} className="vitrine hud flex flex-col gap-1.5 p-5">
              <span className="neon-num font-mono text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-none tabular-nums tracking-[-0.02em]">
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
          <p className="eyebrow">{t.landing.featuresEyebrow}</p>
          <h2 className="max-w-[22ch] text-balance font-display text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-[1.12] tracking-[-0.02em]">
            {t.landing.featuresTitle}
          </h2>
          <p className="max-w-[54ch] text-[15.5px] leading-relaxed text-ink-2">
            {t.landing.featuresSub}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {t.landing.features.map((feature, i) => (
            <Link
              key={feature.title}
              href={featureLinks[i]}
              className="group vitrine hud flex flex-col gap-4 p-7 transition-all duration-300 hover:border-accent-line hover:shadow-[var(--shadow-lift)]"
            >
              <h3 className="font-display text-[20px] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-accent">
                {feature.title}
              </h3>
              <p className="text-[14.5px] leading-relaxed text-ink-2">{feature.body}</p>
              <span className="mt-auto font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
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
            <Chip tone="accent">{t.landing.upcomingChip}</Chip>
            <h2 className="max-w-[20ch] text-balance font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold leading-[1.14] tracking-[-0.02em]">
              {t.landing.upcomingTitle}
            </h2>
            <p className="max-w-[48ch] text-[15px] leading-relaxed text-ink-2">
              {t.landing.upcomingSub}
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {t.landing.upcoming.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3.5 border-b border-line pb-4 last:border-0"
              >
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
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
        <div className="vitrine hud relative flex flex-col items-center gap-7 overflow-hidden border-accent-line px-6 py-16 text-center sm:px-12">
          {/* แสงนีออนสองสีลอยอยู่หลังกล่องปิดท้าย ให้จบหน้าด้วยจังหวะที่สว่างที่สุด */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(28rem 14rem at 20% 0%, rgba(62,231,255,0.16), transparent 70%), radial-gradient(26rem 16rem at 84% 110%, rgba(255,79,216,0.16), transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="grid-floor opacity-50" aria-hidden="true" />

          {/* เนื้อหาต้องเป็น relative ไม่งั้นชั้นแสงด้านบนจะทับตัวหนังสือ */}
          <div className="relative flex flex-col items-center gap-7">
            <h2 className="max-w-[18ch] text-balance font-display text-[clamp(1.9rem,5vw,2.75rem)] font-semibold leading-[1.12] tracking-[-0.02em]">
              {t.landing.finalTitle}
            </h2>
            <p className="max-w-[48ch] text-[15.5px] leading-relaxed text-ink-2">
              {t.landing.finalSub(
                formatNumber(stats.cards, locale),
                stats.sets,
                showcase[0]?.headline ? formatBaht(showcase[0].headline.priceThb, locale) : "—",
              )}
            </p>
            <Link href={p("/browse")} className="btn btn-primary">
              {t.landing.ctaPrimary}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
