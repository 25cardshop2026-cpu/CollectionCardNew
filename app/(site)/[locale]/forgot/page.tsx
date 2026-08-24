import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestResetForm } from "@/components/auth/ResetForm";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  return {
    title: getDictionary(locale).auth.forgotTitle,
    robots: { index: false, follow: true },
  };
}

export default async function ForgotPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  /** mail=0 คือรับเรื่องแล้วแต่เว็บยังส่งอีเมลเองไม่ได้ ต้องบอกให้ตรงความจริง */
  searchParams: Promise<{ sent?: string; mail?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { sent, mail } = await searchParams;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 py-16 sm:px-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] font-semibold tracking-[-0.01em]">
          {t.auth.forgotHeading}
        </h1>
        <p className="text-[14px] leading-relaxed text-ink-2">{t.auth.forgotSub}</p>
      </header>

      {sent && (
        <p
          role="status"
          className="rounded-[4px] border border-up/50 bg-up/5 px-3 py-2.5 text-[13px] leading-relaxed text-up"
        >
          {mail === "0" ? t.auth.forgotSentNoMail : t.auth.forgotSent}
        </p>
      )}

      <div className="vitrine hud p-6">
        <RequestResetForm
          locale={locale}
          labels={{
            email: t.auth.email,
            submit: t.auth.forgotSubmit,
            working: t.auth.working,
          }}
        />
      </div>

      <Link href={p("/login")} className="text-[13.5px] text-ink-3 hover:text-accent">
        {t.auth.backToLogin}
      </Link>
    </div>
  );
}
